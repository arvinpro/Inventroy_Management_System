import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET all items
export async function GET() {
  try {
    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        quantity: true,
        price: true,
        categoryId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

// POST new item
export async function POST(request: Request) {
  try {
    const { name, quantity, price, categoryId } = await request.json();

    if (!name || quantity == null || price == null) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        name,
        quantity: Number(quantity),
        price: Number(price),
        categoryId: categoryId ? Number(categoryId) : null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
