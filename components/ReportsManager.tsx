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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid } from "recharts";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------- Types ----------------
type Book = { id: number; title: string; author: string; quantity: number; price: number; sold?: number };
type Item = { id: number; name: string; quantity: number; price: number; sold?: number };
type Customer = { id: number; name: string; totalPurchase?: number };
type RevenueDay = { date: string; value: number };
type TopSelling = { name: string; quantity: number; revenue: number };
type RecentOrder = { id: number; totalAmount: number; paidAmount: number; paymentStatus: string; createdAt: string; customer?: { name?: string } };

// ---------------- Component ----------------
export default function ProfessionalReport() {
  const [books, setBooks] = useState<Book[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [topSellingItemsReport, setTopSellingItemsReport] = useState<TopSelling[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [paymentStatusCounts, setPaymentStatusCounts] = useState<Record<string, number>>({});
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [filteredData, setFilteredData] = useState<any>(null);
  const lowStockThreshold = 10;

  // ---------------- Fetch Data ----------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, itemsRes, customersRes, reportsRes] = await Promise.all([
          axios.get("/api/books"),
          axios.get("/api/items"),
          axios.get("/api/customer"),
          axios.get("/api/reports"),
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

        // reports data
        const r = reportsRes.data || {};
        setTotalOrders(Number(r.totalOrders || 0));
        setTotalRevenue(Number(r.totalRevenue || 0));
        setRevenueByDay(Array.isArray(r.revenueByDay) ? r.revenueByDay : []);
        setTopSellingItemsReport(Array.isArray(r.topSellingItems) ? r.topSellingItems : []);
        setRecentOrders(Array.isArray(r.recentOrders) ? r.recentOrders : []);
        setPaymentStatusCounts(r.paymentStatusCounts || {});

      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // ---------------- Filter Data by Period ----------------
  useEffect(() => {
    const filterDataByPeriod = () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now);

      switch (reportPeriod) {
        case 'daily':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yearly':
          startDate = new Date(now);
          startDate.setFullYear(now.getFullYear() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
      }

      // Filter orders by date range
      const filteredOrders = recentOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });

      // Calculate period-specific metrics
      const periodRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      const periodOrders = filteredOrders.length;

      setFilteredData({
        orders: filteredOrders,
        revenue: periodRevenue,
        orderCount: periodOrders,
        startDate,
        endDate
      });
    };

    filterDataByPeriod();
  }, [reportPeriod, recentOrders]);

  // ---------------- Calculations ----------------
  const totalBooksStock = books.reduce((sum, b) => sum + b.quantity, 0);
  const totalItemsStock = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalStock = totalBooksStock + totalItemsStock;

  const totalBooksRevenue = books.reduce((sum, b) => sum + b.price * (b.sold || 0), 0);
  const totalItemsRevenue = items.reduce((sum, i) => sum + i.price * (i.sold || 0), 0);
  const computedRevenueFromSales = totalBooksRevenue + totalItemsRevenue;

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

      <Tabs value={reportPeriod} onValueChange={(value) => setReportPeriod(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value={reportPeriod} className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold capitalize">{reportPeriod} Report</h2>
            <p className="text-sm text-gray-600">
              {filteredData ? `From ${filteredData.startDate.toLocaleDateString()} to ${filteredData.endDate.toLocaleDateString()}` : ''}
            </p>
          </div>

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

        {/* ---------------- Extra Summary & Charts ---------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="bg-gray-900 hover:shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm text-white">Total Orders</CardTitle>
              <p className="text-2xl font-bold text-white">{totalOrders}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Box className="w-6 h-6" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gray-900 hover:shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm text-white">Avg Order Value</CardTitle>
              <p className="text-2xl font-bold text-white">{totalOrders ? currency(totalRevenue / totalOrders) : "-"}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CircleDollarSign className="w-6 h-6" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gray-900 hover:shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm text-white">Payment Status</CardTitle>
              <p className="text-base text-white">
                P:{paymentStatusCounts.PENDING ?? 0} • Par:{paymentStatusCounts.PARTIAL ?? 0} • Paid:{paymentStatusCounts.PAID ?? 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </CardHeader>
        </Card>
      </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>Revenue - Last 7 days</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueByDay.map(r => ({ date: r.date, value: Number(r.value || 0) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ReTooltip />
                <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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

        {/* ---------------- Top Selling Items (books+items aggregated) ---------------- */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Top Selling Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Qty Sold</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSellingItemsReport.map((t, i) => (
                <TableRow key={i}>
                  <TableCell>{i+1}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.quantity}</TableCell>
                  <TableCell>{currency(t.revenue)}</TableCell>
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

        {/* ---------------- Recent Orders ---------------- */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((o, idx) => (
                <TableRow key={o.id}>
                  <TableCell>{idx+1}</TableCell>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{o.customer?.name || "-"}</TableCell>
                  <TableCell>{currency(Number(o.totalAmount || 0))}</TableCell>
                  <TableCell>{currency(Number(o.paidAmount || 0))}</TableCell>
                  <TableCell>{o.paymentStatus}</TableCell>
                  <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ---------------- Period-specific Summary ---------------- */}
      {filteredData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card className="bg-blue-900 hover:shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-white">Period Orders</CardTitle>
                <p className="text-2xl font-bold text-white">{filteredData.orderCount}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Box className="w-6 h-6" />
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-green-900 hover:shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-white">Period Revenue</CardTitle>
                <p className="text-2xl font-bold text-white">{currency(filteredData.revenue)}</p>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <CircleDollarSign className="w-6 h-6" />
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-purple-900 hover:shadow-lg">
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-white">Avg Order Value</CardTitle>
                <p className="text-2xl font-bold text-white">
                  {filteredData.orderCount ? currency(filteredData.revenue / filteredData.orderCount) : "-"}
                </p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* ---------------- Period Orders Table ---------------- */}
      {filteredData && (
        <Card className="mt-6">
          <CardHeader><CardTitle>{reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Orders</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.orders.map((o: RecentOrder, idx: number) => (
                  <TableRow key={o.id}>
                    <TableCell>{idx+1}</TableCell>
                    <TableCell>{o.id}</TableCell>
                    <TableCell>{o.customer?.name || "-"}</TableCell>
                    <TableCell>{currency(Number(o.totalAmount || 0))}</TableCell>
                    <TableCell>{currency(Number(o.paidAmount || 0))}</TableCell>
                    <TableCell>{o.paymentStatus}</TableCell>
                    <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

        </TabsContent>
      </Tabs>
    </div>
  );
}
