"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Box, CircleDollarSign, Users, TrendingUp } from "lucide-react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------------- Types ----------------
type Book = { id: number; title: string; author: string; quantity: number; price: number; sold?: number };
type Item = { id: number; name: string; quantity: number; price: number; sold?: number };
type Customer = { id: number; name: string; totalPurchase?: number };

// ---------------- Component ----------------
export default function ProfessionalReport() {
  const [books, setBooks] = useState<Book[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const lowStockThreshold = 10;

  // ---------------- Fetch Data ----------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, itemsRes, customersRes] = await Promise.all([
          axios.get("/api/books"),
          axios.get("/api/items"),
          axios.get("/api/customer"),
        ]);

       setBooks(
  booksRes.data.map((b: any) => ({
    ...b,
    quantity: Number(b.quantity || 0),
    price: Number(b.price || 0),
    sold: Number(b.sold || 0), // default 0
  }))
);

        setItems(itemsRes.data.map((i: Item) => ({
          ...i,
          quantity: Number(i.quantity),
          price: Number(i.price),
          sold: Number(i.sold || 0)
        })));
        setCustomers(
  Array.isArray(customersRes.data.customers)
    ? customersRes.data.customers.map((c: Customer) => ({
        ...c,
        totalPurchase: Number(c.totalPurchase || 0),
      }))
    : []
);

      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // ---------------- Calculations ----------------
  const totalBooksStock = books.reduce((sum, b) => sum + b.quantity, 0);
  const totalItemsStock = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalStock = totalBooksStock + totalItemsStock;

  const totalBooksRevenue = books.reduce((sum, b) => sum + b.price * (b.sold || 0), 0);
  const totalItemsRevenue = items.reduce((sum, i) => sum + i.price * (i.sold || 0), 0);
  const totalRevenue = totalBooksRevenue + totalItemsRevenue;

  const totalCustomers = customers.length;
  const topCustomers = [...customers].sort((a, b) => (b.totalPurchase || 0) - (a.totalPurchase || 0)).slice(0, 5);

  const lowStockBooks = books.filter(b => b.quantity < lowStockThreshold);
  const lowStockItems = items.filter(i => i.quantity < lowStockThreshold);

  const topSellingBooks = [...books].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5);

  const currency = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // ---------------- Export ----------------
  const exportCSV = () => {
    const rows = [["Title","Sold","Price","Revenue"]];
    topSellingBooks.forEach(b => rows.push([b.title, (b.sold||0).toString(), b.price.toString(), ((b.sold||0)*b.price).toString()]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "top_selling_books.csv");
  };

 const exportPDF = () => {
  const doc = new jsPDF();
  doc.text("Top Selling Books", 14, 16);

  autoTable(doc, {
    startY: 20,
    head: [["Title", "Sold", "Price", "Revenue"]],
    body: topSellingBooks.map(b => [
      b.title || "-",           // title fallback
      b.sold ?? 0,              // sold fallback
      b.price ?? 0,             // price fallback
      (b.sold ?? 0) * (b.price ?? 0) // revenue fallback
    ]),
  });

  doc.save("top_selling_books.pdf");
};


  // ---------------- Render ----------------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Professional Report</h1>

      {/* ---------------- Summary Cards ---------------- */}
      <TooltipProvider>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-white">
          <Card className="bg-gray-900 hover:shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-white">Total Stock</CardTitle>
                <p className="text-2xl font-bold text-white">{totalStock}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Box className="w-6 h-6" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Combined stock of books & items</TooltipContent>
              </Tooltip>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900 hover:shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-white">Total Revenue</CardTitle>
                <p className="text-2xl font-bold text-white">{currency(totalRevenue)}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CircleDollarSign className="w-6 h-6"/>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Total revenue from sales</TooltipContent>
              </Tooltip>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900 hover:shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-white">Total Customers</CardTitle>
                <p className="text-2xl font-bold text-white">{totalCustomers}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                    <Users className="w-6 h-6"/>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Number of registered customers</TooltipContent>
              </Tooltip>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900 hover:shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-white">Top Revenue Customer</CardTitle>
                <p className="text-2xl font-bold text-white">{topCustomers[0]?.name || "-"}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                    <TrendingUp className="w-6 h-6"/>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Customer with highest purchase</TooltipContent>
              </Tooltip>
            </CardHeader>
          </Card>
        </div>
      </TooltipProvider>

      {/* ---------------- Export Buttons ---------------- */}
      <div className="flex gap-2 mt-4">
        <button onClick={exportCSV} className="bg-green-500 text-white px-3 py-1 rounded">Export CSV</button>
        <button onClick={exportPDF} className="bg-blue-500 text-white px-3 py-1 rounded">Export PDF</button>
      </div>

      {/* ---------------- Top Selling Books ---------------- */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Top Selling Books</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Sold</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSellingBooks.map((b, i) => (
                <TableRow key={b.id}>
                  <TableCell>{i+1}</TableCell>
                  <TableCell>{b.title}</TableCell>
                  <TableCell>{b.sold}</TableCell>
                  <TableCell>{currency(b.price ?? 0)}</TableCell>
                  <TableCell>{currency((b.sold ?? 0) * (b.price ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ---------------- Low Stock Items ---------------- */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Low Stock</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name / Title</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...lowStockBooks, ...lowStockItems].map((i, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx+1}</TableCell>
                  <TableCell>{'title' in i ? i.title : i.name}</TableCell>
                  <TableCell>{i.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
