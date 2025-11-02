import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// CREATE Book
export async function POST(request: Request) {
  try {
    const { title, author, quantity, price, categoryId } = await request.json();

    if (!title || !author || quantity == null || price == null) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const book = await prisma.book.create({
      data: {
        title,
        author,
        quantity: Number(quantity),
        price: Number(price),
        categoryId: categoryId ? Number(categoryId) : null,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error("Error adding book:", error);
    return NextResponse.json({ error: "Failed to add book" }, { status: 500 });
  }
}

// READ all books
export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Convert quantity & price to numbers
    const formatted = books.map((b) => ({
      ...b,
      quantity: Number(b.quantity),
      price: Number(b.price),
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
  }
}
