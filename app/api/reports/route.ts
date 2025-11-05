import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 1️⃣ Fetch totals
    const books = await prisma.book.findMany();
    const items = await prisma.item.findMany();

    const totalBooksStock = books.reduce((sum, b) => sum + b.quantity, 0);
    const totalItemsStock = items.reduce((sum, i) => sum + i.quantity, 0);

    const totalBooksValue = books.reduce((sum, b) => sum + b.price * b.quantity, 0);
    const totalItemsValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // 2️⃣ Optional: group by category
    const categories = await prisma.category.findMany({
      include: {
        books: true,
        items: true,
      },
    });

    const categoryReports = categories.map((cat) => ({
      name: cat.name,
      totalStock:
        (cat.books?.reduce((s, b) => s + b.quantity, 0) || 0) +
        (cat.items?.reduce((s, i) => s + i.quantity, 0) || 0),
      totalValue:
        (cat.books?.reduce((s, b) => s + b.price * b.quantity, 0) || 0) +
        (cat.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0),
    }));

    // Additional metrics: orders, revenue, revenue by day, top selling items, recent orders, payment status counts
    const totalOrders = await prisma.order.count();

    const totalRevenueAgg = await prisma.sale.aggregate({ _sum: { totalPrice: true } });
    const totalRevenue = totalRevenueAgg._sum.totalPrice || 0;

    // Revenue by day (last 7 days)
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const recentSales = await prisma.sale.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, totalPrice: true },
      orderBy: { createdAt: 'asc' },
    });

    const revenueByDayMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      revenueByDayMap[d.toISOString().slice(0, 10)] = 0;
    }

    recentSales.forEach((s) => {
      const key = s.createdAt.toISOString().slice(0, 10);
      revenueByDayMap[key] = (revenueByDayMap[key] || 0) + Number(s.totalPrice || 0);
    });

    const revenueByDay = Object.entries(revenueByDayMap).map(([date, value]) => ({ date, value }));

    // Top selling items (aggregate SaleItem by book or item name)
    const saleItems = await prisma.saleItem.findMany({ include: { item: true, book: true } });

    const topMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    saleItems.forEach((si) => {
      const name = si.item?.name || si.book?.title || `Unknown-${si.id}`;
      if (!topMap[name]) topMap[name] = { name, quantity: 0, revenue: 0 };
      topMap[name].quantity += si.quantity || 0;
      topMap[name].revenue += (si.price || 0) * (si.quantity || 0);
    });

    const topSellingItems = Object.values(topMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { customer: true },
    });

    // Payment status counts
    const paymentStatusCounts: Record<string, number> = {};
    const statuses = ["PENDING", "PARTIAL", "PAID"];
    for (const s of statuses) {
      // @ts-ignore - dynamic enum key
      paymentStatusCounts[s] = await prisma.order.count({ where: { paymentStatus: s } });
    }

    return NextResponse.json({
      totalBooksStock,
      totalItemsStock,
      totalBooksValue,
      totalItemsValue,
      categoryReports,
      // new
      totalOrders,
      totalRevenue,
      revenueByDay,
      topSellingItems,
      recentOrders,
      paymentStatusCounts,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
