"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";

import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type Customer = { id: number; name: string };
type Item = {
  id: number;
  name?: string;
  title?: string;
  price: number;
  quantity: number;
};
type Sale = {
  id: number;
  customerId: number;
  productId: number;
  productType: "Book" | "Item";
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: "Pending" | "Partial" | "Paid";
};

export default function SalesForm() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [books, setBooks] = useState<Item[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [quantityError, setQuantityError] = useState<string>("");

  const [form, setForm] = useState({
    customerId: 0,
    productType: "Book" as "Book" | "Item",
    productId: 0,
    quantity: 1,
    paidAmount: 0,
    paymentStatus: "Pending" as "Pending" | "Partial" | "Paid",
  });

  const [pricePerUnit, setPricePerUnit] = useState(0);

  // Search, sort, pagination
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof Sale>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, bRes, iRes, oRes] = await Promise.all([
          axios.get("/api/customer"),
          axios.get("/api/books"),
          axios.get("/api/items"),
          axios.get("/api/orders"),
        ]);

        setCustomers(cRes.data.customers || []);
        setBooks(bRes.data || []);
        setItems(iRes.data || []);
        setProducts(bRes.data || []);

        const salesData: Sale[] = oRes.data.flatMap((order: any) =>
          order.sales.flatMap((sale: any) =>
            sale.saleItems.map((si: any) => ({
              id: sale.id,
              customerId: order.customerId,
              productId: si.itemId || si.bookId,
              productType: si.itemId ? "Item" : "Book",
              quantity: si.quantity,
              totalAmount: si.price * si.quantity,
              paidAmount: order.paidAmount,
              dueAmount: si.price * si.quantity - order.paidAmount,
              paymentStatus:
                order.paymentStatus === "PENDING"
                  ? "Pending"
                  : order.paymentStatus === "PAID"
                  ? "Paid"
                  : "Partial",
            }))
          )
        );

        setSales(salesData);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to load data");
      }
    };

    fetchData();
  }, []);

  // Update products on type change
  useEffect(() => {
    setProducts(form.productType === "Book" ? books : items);
    setForm((prev) => ({ ...prev, productId: 0, quantity: 1 }));
    setPricePerUnit(0);
    setQuantityError("");
  }, [form.productType, books, items]);

  const handleChange = (field: keyof typeof form, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleProductChange = (productId: number) => {
    const selected = products.find((p) => p.id === productId);
    if (!selected) return;
    setForm((prev) => ({ ...prev, productId, quantity: 1 }));
    setPricePerUnit(selected.price);
    setQuantityError("");
  };

  const handleQuantityChange = (qty: number) => {
    const product = products.find((p) => p.id === form.productId);
    if (product && qty > product.quantity)
      setQuantityError(`Available stock: ${product.quantity}`);
    else setQuantityError("");
    setForm((prev) => ({ ...prev, quantity: qty }));
  };

  const totalAmount = pricePerUnit * form.quantity;
  const dueAmount = totalAmount - form.paidAmount;

  // Add / Edit sale
  const handleSubmit = async () => {
    if (
      !form.customerId ||
      !form.productId ||
      form.quantity < 1 ||
      quantityError
    ) {
      return toast.error("Please fix all errors before submitting");
    }

    try {
      const payload = {
        customerId: form.customerId,
        items: [
          {
            itemId: form.productType === "Item" ? form.productId : undefined,
            bookId: form.productType === "Book" ? form.productId : undefined,
            quantity: form.quantity,
            price: pricePerUnit,
            productType: form.productType,
          },
        ],
        paidAmount: form.paidAmount,
        paymentStatus: form.paymentStatus.toUpperCase(),
      };

      let res;
      if (editingSaleId) {
        res = await axios.put(`/api/orders/${editingSaleId}`, payload);
        setSales((prev) =>
          prev.map((s) =>
            s.id === editingSaleId
              ? { ...s, ...payload.items[0], totalAmount, dueAmount }
              : s
          )
        );
      } else {
        res = await axios.post("/api/orders", payload);
        const newSale: Sale = {
          id: res.data.id,
          customerId: form.customerId,
          productId: form.productId,
          productType: form.productType,
          quantity: form.quantity,
          totalAmount,
          paidAmount: form.paidAmount,
          dueAmount,
          paymentStatus: form.paymentStatus,
        };
        setSales([...sales, newSale]);
      }

      toast.success(
        editingSaleId ? "Sale updated successfully" : "Sale added successfully"
      );
      setModalOpen(false);
      setEditingSaleId(null);
      setForm({
        customerId: 0,
        productType: "Book",
        productId: 0,
        quantity: 1,
        paidAmount: 0,
        paymentStatus: "Pending",
      });
      setPricePerUnit(0);
      setQuantityError("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add/update sale");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/orders/${id}`);
      setSales(sales.filter((s) => s.id !== id));
      toast.success("Sale deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete sale");
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSaleId(sale.id);
    setForm({
      customerId: sale.customerId,
      productType: sale.productType,
      productId: sale.productId,
      quantity: sale.quantity,
      paidAmount: sale.paidAmount,
      paymentStatus: sale.paymentStatus,
    });
    const selected = products.find((p) => p.id === sale.productId);
    setPricePerUnit(selected?.price || 0);
    setModalOpen(true);
  };

  // Filtered & sorted sales
  const filteredSales = useMemo(() => {
    const searched = sales.filter((s) => {
      const customer =
        customers.find((c) => c.id === s.customerId)?.name.toLowerCase() || "";
      const product =
        [...books, ...items]
          .find((p) => p.id === s.productId)
          ?.name?.toLowerCase() || "";
      return (
        customer.includes(search.toLowerCase()) ||
        product.includes(search.toLowerCase())
      );
    });

    return [...searched].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [sales, search, sortField, sortOrder]);

  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalDue = sales.reduce((sum, s) => sum + s.dueAmount, 0);

  // Chart data
  const chartData = useMemo(() => {
    return customers.map((c) => {
      const customerSales = sales.filter((s) => s.customerId === c.id);
      return {
        name: c.name,
        Revenue: customerSales.reduce((sum, s) => sum + s.totalAmount, 0),
        Due: customerSales.reduce((sum, s) => sum + s.dueAmount, 0),
      };
    });
  }, [sales, customers]);

  return (
    <div className="p-6 bg-white rounded-xl shadow space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales / Orders</h1>
        <Button onClick={() => setModalOpen(true)}>Add Sale</Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by Customer or Product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={sortField}
          onValueChange={(val) => setSortField(val as keyof Sale)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="totalAmount">Total</SelectItem>
            <SelectItem value="dueAmount">Due</SelectItem>
            <SelectItem value="quantity">Quantity</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortOrder}
          onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Asc</SelectItem>
            <SelectItem value="desc">Desc</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-green-100 rounded shadow">
          <p className="font-semibold">Total Revenue</p>
          <p className="text-xl">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-red-100 rounded shadow">
          <p className="font-semibold">Total Due</p>
          <p className="text-xl">${totalDue.toFixed(2)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Revenue" fill="#4ade80" />
            <Bar dataKey="Due" fill="#f87171" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-200">
            <TableHead>#</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedSales.map((s, idx) => {
            const customer =
              customers.find((c) => c.id === s.customerId)?.name || "";
            const product = [...books, ...items].find(
              (p) => p.id === s.productId
            );
            const productName = product?.name || product?.title || "";
            return (
              <TableRow key={s.id}>
                <TableCell>
                  {idx + 1 + (currentPage - 1) * itemsPerPage}
                </TableCell>
                <TableCell>{customer}</TableCell>
                <TableCell>{productName}</TableCell>
                <TableCell>{s.productType}</TableCell>
                <TableCell>{s.quantity}</TableCell>
                <TableCell>${s.totalAmount.toFixed(2)}</TableCell>
                <TableCell>${s.paidAmount.toFixed(2)}</TableCell>
                <TableCell>${s.dueAmount.toFixed(2)}</TableCell>
                <TableCell>{s.paymentStatus}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(s)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(s.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <Button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Prev
        </Button>
        <span>
          {currentPage} / {totalPages}
        </span>
        <Button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Next
        </Button>
      </div>

      {/* Add/Edit Modal */}

      {/* Add/Edit Sale Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSaleId ? "Edit Sale" : "Add Sale"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Customer */}
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={form.customerId ? form.customerId.toString() : ""}
                onValueChange={(val) => handleChange("customerId", Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Type */}
            <div>
              <Label htmlFor="productType">Product Type</Label>
              <Select
                value={form.productType}
                onValueChange={(val) => handleChange("productType", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Book">Book</SelectItem>
                  <SelectItem value="Item">Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product */}
            <div>
              <Label htmlFor="product">Product</Label>
              <Select
                value={form.productId ? form.productId.toString() : ""}
                onValueChange={(val) => handleProductChange(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name || p.title} (Stock: {p.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value))}
              />
              {quantityError && (
                <p className="text-red-500 text-sm">{quantityError}</p>
              )}
            </div>

            {/* Paid Amount */}
            <div>
              <Label htmlFor="paidAmount">Paid Amount</Label>
              <Input
                type="number"
                min={0}
                value={form.paidAmount}
                onChange={(e) =>
                  handleChange("paidAmount", Number(e.target.value))
                }
              />
            </div>

            {/* Payment Status */}
            <div>
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select
                value={form.paymentStatus}
                onValueChange={(val) => handleChange("paymentStatus", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Total & Due */}
            <div className="mt-2">
              <p>
                Total Amount:{" "}
                <span className="font-semibold">
                  ${(pricePerUnit * form.quantity).toFixed(2)}
                </span>
              </p>
              <p>
                Due Amount:{" "}
                <span className="font-semibold">
                  ${(pricePerUnit * form.quantity - form.paidAmount).toFixed(2)}
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!!quantityError} onClick={handleSubmit}>
              {editingSaleId ? "Update Sale" : "Add Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
