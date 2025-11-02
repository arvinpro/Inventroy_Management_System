"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2, MoreHorizontal, Filter, ArrowDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// PDF & CSV
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// ✅ Schema
const itemSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  categoryId: z.number(),
  quantity: z.preprocess((val) => Number(val), z.number().min(0, "Must be ≥ 0")),
  price: z.preprocess((val) => Number(val), z.number().min(1, "Must be ≥ 1")),
});

type ItemFormData = z.infer<typeof itemSchema>;
type Category = { id: number; name: string };

export default function ItemsManager() {
  const [items, setItems] = useState<ItemFormData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filterQuantity, setFilterQuantity] = useState("All");
  const [filterPrice, setFilterPrice] = useState("All");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", categoryId: 0, quantity: 1, price: 1 },
  });

  // Fetch items & categories
  const fetchItems = async () => {
    try {
      const res = await axios.get("/api/items", { headers: { "Cache-Control": "no-store" } });
      if (Array.isArray(res.data)) setItems(res.data);
    } catch {
      toast.error("Failed to load items");
    }
  };
  const fetchCategories = async () => {
    try {
      const res = await axios.get("/api/categories", { headers: { "Cache-Control": "no-store" } });
      if (Array.isArray(res.data)) setCategories(res.data);
    } catch {
      toast.error("Failed to load categories");
    }
  };
  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  // Add / Edit Item
  const onSubmit = async (data: ItemFormData) => {
    try {
      if (editingIndex !== null) {
        const item = items[editingIndex];
        const res = await axios.put(`/api/items/${item.id}`, data);
        const updatedItems = [...items];
        updatedItems[editingIndex] = res.data;
        setItems(updatedItems);
        toast.success("Item updated");
        setEditingIndex(null);
      } else {
        const res = await axios.post("/api/items", data);
        setItems((prev) => [res.data, ...prev]);
        toast.success("Item added");
      }
      form.reset();
      setOpen(false);
    } catch {
      toast.error("Failed to save item");
    }
  };

  // Edit / Delete
  const handleEdit = (index: number) => {
    const item = items[index];
    form.reset(item);
    setEditingIndex(index);
    setOpen(true);
  };
  const confirmDelete = async () => {
    if (deleteIndex !== null) {
      const item = items[deleteIndex];
      try {
        await axios.delete(`/api/items/${item.id}`);
        setItems((prev) => prev.filter((_, i) => i !== deleteIndex));
        toast.success("Item deleted");
      } catch {
        toast.error("Failed to delete");
      } finally {
        setDeleteIndex(null);
      }
    }
  };

  // Filters
  const filteredItems = items.filter((item) => {
    const categoryName = categories.find((c) => c.id === item.categoryId)?.name || "";
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesQuantity =
      filterQuantity === "All"
        ? true
        : filterQuantity === "Low Stock"
        ? item.quantity < 5
        : filterQuantity === "In Stock"
        ? item.quantity >= 5
        : filterQuantity === "Out of Stock"
        ? item.quantity === 0
        : true;
    const matchesPrice =
      filterPrice === "All"
        ? true
        : filterPrice === "Cheap"
        ? item.price < 100
        : filterPrice === "Moderate"
        ? item.price >= 100 && item.price < 500
        : filterPrice === "Expensive"
        ? item.price >= 500
        : true;
    return matchesSearch && matchesQuantity && matchesPrice;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  useEffect(() => setPage(1), [search, filterQuantity, filterPrice]);

  // Totals
  const totalItems = filteredItems.length;
  const totalQuantity = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalRevenue = filteredItems.reduce((sum, i) => sum + i.quantity * i.price, 0);

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Items Report", 14, 15);
    const tableColumn = ["#", "Name", "Category", "Qty", "Price ($)", "Total ($)"];
    const tableRows: any[] = [];
    filteredItems.forEach((item, index) => {
      const categoryName = categories.find((c) => c.id === item.categoryId)?.name || "-";
      tableRows.push([index + 1, item.name, categoryName, item.quantity, item.price, item.quantity * item.price]);
    });
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 25 });
    doc.save("items_report.pdf");
  };

  // CSV Export
  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredItems.map((item, index) => ({
        "#": index + 1,
        Name: item.name,
        Category: categories.find((c) => c.id === item.categoryId)?.name || "-",
        Quantity: item.quantity,
        Price: item.price,
        Total: item.quantity * item.price,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");
    XLSX.writeFile(wb, "items_report.xlsx");
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-2xl p-6">
        <h1 className="text-4xl font-semibold text-gray-800 mb-2">Add Other Items</h1>
        <p className="text-gray-600 mb-6 opacity-50">Add and manage your inventory items</p>

       

            {/* Totals + Export */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-100 p-4 rounded-xl mb-8">
          <div>Total Books: <b>{totalItems}</b></div>
          <div>Total Quantity: <b>{totalQuantity}</b></div>
          <div>Total Revenue: <b>Total Revenue: NPR {totalRevenue}</b></div>
          <div className="flex gap-2">
            <Button onClick={exportPDF} className="flex items-center gap-2"><ArrowDown size={16} /> Export PDF</Button>
            <Button onClick={exportCSV} className="flex items-center gap-2"><ArrowDown size={16} /> Export CSV</Button>
          </div>
        </div>


        {/* Filters & Add Item */}
        <div className="flex flex-wrap gap-3 justify-between mb-6">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
            <select
              value={filterQuantity}
              onChange={(e) => setFilterQuantity(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-gray-50"
            >
              <option value="All">All Quantity</option>
              <option value="Low Stock">Low Stock (&lt;5)</option>
              <option value="In Stock">In Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
            <select
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-gray-50"
            >
              <option value="All">All Prices</option>
              <option value="Cheap">Cheap (&lt;NPR100)</option>
              <option value="Moderate">NPR100–NPR500</option>
              <option value="Expensive">≥NPR500</option>
            </select>
          </div>

          {/* Add/Edit Dialog */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Filter size={16} /> {editingIndex !== null ? "Edit Item" : "Add Item"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingIndex !== null ? "Edit Item" : "Add New Item"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label>Name</label>
                  <Input {...form.register("name")} />
                </div>
                <div>
                  <label>Category</label>
                  <select {...form.register("categoryId", { valueAsNumber: true })}>
                    <option value={0}>Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>Quantity</label>
                    <Input type="number" {...form.register("quantity")} />
                  </div>
                  <div>
                    <label>Price</label>
                    <Input type="number" {...form.register("price")} />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingIndex !== null ? "Update Item" : "Add Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <Table>
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableHead className="text-center w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-center">Price (NPR)</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, index) => {
                  const categoryName = categories.find((c) => c.id === item.categoryId)?.name || "-";
                  return (
                    <TableRow
                      key={item.id}
                      className={
                        item.quantity === 0
                          ? "bg-red-50"
                          : item.quantity < 5
                          ? "bg-yellow-50"
                          : "bg-white"
                      }
                    >
                      <TableCell className="text-center">
                        {index + 1 + (page - 1) * itemsPerPage}
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{categoryName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">{item.price}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleEdit(index + (page - 1) * itemsPerPage)
                              }
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                setDeleteIndex(index + (page - 1) * itemsPerPage)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="mr-2"
          >
            Previous
          </Button>
          <span className="px-3 py-1 text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="ml-2"
          >
            Next
          </Button>
        </div>

        {/* Delete Confirm */}
        <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
