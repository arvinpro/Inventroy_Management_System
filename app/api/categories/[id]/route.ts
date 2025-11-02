import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Category ID is required");

    await prisma.category.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
