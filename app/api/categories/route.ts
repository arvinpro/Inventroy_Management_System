import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET all categories with total items + books count
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { items: true, books: true }, // Count both
        },
      },
    });

    // ✅ Combine both counts
    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      totalItems: c._count.items + c._count.books,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// ✅ POST create category
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();
    const category = await prisma.category.create({
      data: { name, description },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("❌ Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

// ✅ PUT update category
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description } = await request.json();
    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, description },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ Error updating category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}