import { NextRequest, NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';

// PUT update item
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { name, quantity, price, categoryId } = await req.json();

    const updated = await prisma.item.update({
      where: { id: Number(params.id) },
      data: {
        name,
        quantity: Number(quantity),
        price: Number(price),
        categoryId: categoryId ? Number(categoryId) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}


// DELETE item
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.item.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ message: 'Item deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
