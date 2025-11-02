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

    return NextResponse.json({
      totalBooksStock,
      totalItemsStock,
      totalBooksValue,
      totalItemsValue,
      categoryReports,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
