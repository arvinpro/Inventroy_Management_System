import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ✅ UPDATE BOOK
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { title, author, quantity, price, categoryId } = await req.json();

    const updated = await prisma.book.update({
      where: { id: Number(params.id) },
      data: {
        title,
        author,
        quantity: Number(quantity),
        price: Number(price),
        categoryId: categoryId ? Number(categoryId) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}


// ✅ DELETE BOOK
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ error: 'ID not provided' }, { status: 400 });
    }

    const deleted = await prisma.book.delete({
      where: { id: Number(params.id) },
    });

    return NextResponse.json({ message: 'Book deleted successfully', book: deleted });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
