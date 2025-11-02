"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, MoreHorizontal, Filter, FileText, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ✅ Schema
const bookSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  categoryId: z.number().min(1, "Select a category"),
  quantity: z.preprocess((val) => Number(val), z.number().min(0, "Must be ≥ 0")),
  price: z.preprocess((val) => Number(val), z.number().min(1, "Must be ≥ 1")),
});

type BookFormData = z.infer<typeof bookSchema>;
type Category = { id: number; name: string };

export default function BooksManager() {
  const [books, setBooks] = useState<BookFormData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterQuantity, setFilterQuantity] = useState("All");
  const [filterPrice, setFilterPrice] = useState("All");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const form = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: { title: "", author: "", categoryId: 0, quantity: 1, price: 1 },
  });

  // ---------------- Fetch Books & Categories ----------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, categoriesRes] = await Promise.all([
          axios.get("/api/books"),
          axios.get("/api/categories"),
        ]);
        setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ---------------- Add / Edit Book ----------------
  const onSubmit = async (data: BookFormData) => {
    try {
      if (editingIndex !== null) {
        const book = books[editingIndex];
        const res = await axios.put(`/api/books/${book.id}`, data);
        const updatedBooks = [...books];
        updatedBooks[editingIndex] = res.data;
        setBooks(updatedBooks);
        toast.success("Book updated");
        setEditingIndex(null);
      } else {
        const res = await axios.post("/api/books", data);
        setBooks((prev) => [res.data, ...prev]);
        toast.success("Book added");
      }
      form.reset();
      setOpen(false);
    } catch {
      toast.error("Failed to save book");
    }
  };

  const handleEdit = (index: number) => {
    const book = books[index];
    form.reset(book);
    setEditingIndex(index);
    setOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteIndex !== null) {
      const book = books[deleteIndex];
      try {
        await axios.delete(`/api/books/${book.id}`);
        setBooks((prev) => prev.filter((_, i) => i !== deleteIndex));
        toast.success("Book deleted");
      } catch {
        toast.error("Failed to delete");
      } finally {
        setDeleteIndex(null);
      }
    }
  };

  // ---------------- Filters ----------------
  const filteredBooks = books.filter((book) => {
    const categoryName = categories.find((c) => c.id === book.categoryId)?.name || "";
    const matchesSearch =
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase()) ||
      categoryName.toLowerCase().includes(search.toLowerCase());

    const matchesQuantity =
      filterQuantity === "All"
        ? true
        : filterQuantity === "Low Stock"
        ? book.quantity < 5
        : filterQuantity === "In Stock"
        ? book.quantity >= 5
        : filterQuantity === "Out of Stock"
        ? book.quantity === 0
        : true;

    const matchesPrice =
      filterPrice === "All"
        ? true
        : filterPrice === "Cheap"
        ? book.price < 100
        : filterPrice === "Moderate"
        ? book.price >= 100 && book.price < 500
        : filterPrice === "Expensive"
        ? book.price >= 500
        : true;

    return matchesSearch && matchesQuantity && matchesPrice;
  });

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage) || 1;
  const paginatedBooks = filteredBooks.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  useEffect(() => setPage(1), [search, filterQuantity, filterPrice]);

  // ---------------- Totals ----------------
  const totalBooksCount = filteredBooks.length;
  const totalQuantity = filteredBooks.reduce((sum, b) => sum + b.quantity, 0);
  const totalRevenue = filteredBooks.reduce((sum, b) => sum + b.quantity * b.price, 0);
  const currency = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "NPR", maximumFractionDigits: 0 });

  // ---------------- Export PDF ----------------
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Books Report", 14, 20);

    const tableColumn = ["Title", "Author", "Category", "Qty", "Price", "Revenue"];
    const tableRows = filteredBooks.map((b) => [
      b.title,
      b.author,
      categories.find((c) => c.id === b.categoryId)?.name || "-",
      b.quantity,
      b.price,
      b.quantity * b.price,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save("Books_Report.pdf");
  };

  // ---------------- Export CSV ----------------
  const exportCSV = () => {
    const headers = ["Title", "Author", "Category", "Qty", "Price", "Revenue"];
    const rows = filteredBooks.map((b) => [
      b.title,
      b.author,
      categories.find((c) => c.id === b.categoryId)?.name || "-",
      b.quantity,
      b.price,
      b.quantity * b.price,
    ]);
    const csvContent =
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "books_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-gray-500 text-lg">
        Loading books and categories...
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-2xl p-6 space-y-6">
        <h1 className="text-4xl font-semibold text-gray-800">Books Manager</h1>

        {/* Totals + Export */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-100 p-4 rounded-xl">
          <div>Total Books: <b>{totalBooksCount}</b></div>
          <div>Total Quantity: <b>{totalQuantity}</b></div>
          <div>Total Revenue: <b>{currency(totalRevenue)}</b></div>
          <div className="flex gap-2">
            <Button onClick={exportPDF} className="flex items-center gap-2"><FileText size={16} /> Export PDF</Button>
            <Button onClick={exportCSV} className="flex items-center gap-2"><ArrowDown size={16} /> Export CSV</Button>
          </div>
        </div>

        {/* Filters & Add Book */}
        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <select value={filterQuantity} onChange={(e) => setFilterQuantity(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-gray-50">
              <option value="All">All Quantity</option>
              <option value="Low Stock">Low Stock (&lt;5)</option>
              <option value="In Stock">In Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
            <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-gray-50">
              <option value="All">All Prices</option>
              <option value="Cheap">&lt;$100</option>
              <option value="Moderate">$100–$500</option>
              <option value="Expensive">≥$500</option>
            </select>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2"><Filter size={16} /> {editingIndex !== null ? "Edit Book" : "Add Book"}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingIndex !== null ? "Edit Book" : "Add New Book"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label>Title</label>
                  <Input {...form.register("title")} />
                </div>
                <div>
                  <label>Author</label>
                  <Input {...form.register("author")} />
                </div>
                <div>
                  <label>Category</label>
                  <select {...form.register("categoryId", { valueAsNumber: true })}>
                    <option value={0}>Select Category</option>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label>Quantity</label><Input type="number" {...form.register("quantity")} /></div>
                  <div><label>Price</label><Input type="number" {...form.register("price")} /></div>
                </div>
                <Button type="submit" className="w-full">{editingIndex !== null ? "Update Book" : "Add Book"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Books Table */}
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <Table>
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableHead className="text-center w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-center">Price</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-6">No books found.</TableCell></TableRow>
              ) : (
                paginatedBooks.map((book, index) => {
                  const categoryName = categories.find((c) => c.id === book.categoryId)?.name || "-";
                  return (
                    <TableRow key={book.id} className={book.quantity === 0 ? "bg-red-50" : book.quantity < 5 ? "bg-yellow-50" : "bg-white"}>
                      <TableCell className="text-center">{index + 1 + (page - 1) * itemsPerPage}</TableCell>
                      <TableCell>{book.title}</TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>{categoryName}</TableCell>
                      <TableCell className="text-center">{book.quantity}</TableCell>
                      <TableCell className="text-center">{book.price}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(index + (page - 1) * itemsPerPage)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteIndex(index + (page - 1) * itemsPerPage)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
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
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="px-3 py-1 text-sm font-medium">Page {page} of {totalPages}</span>
          <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>

        {/* Delete Confirm */}
        <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this book? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
