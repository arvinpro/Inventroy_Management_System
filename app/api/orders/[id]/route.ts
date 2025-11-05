import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 🟢 UPDATE order
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } 
) {
  try {
     const { id } = await context.params; // 👈 await it
    const orderId = Number(id);

    if (!orderId) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();
    const { items, paidAmount, paymentStatus } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 });
    }

    // Fetch existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { sales: { include: { saleItems: true } } },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Restore stock from previous saleItems
    for (const sale of existingOrder.sales) {
      for (const si of sale.saleItems) {
        if (si.itemId)
          await prisma.item.update({
            where: { id: si.itemId },
            data: { quantity: { increment: si.quantity } },
          });
        if (si.bookId)
          await prisma.book.update({
            where: { id: si.bookId },
            data: { quantity: { increment: si.quantity } },
          });
      }
    }

    // Delete old saleItems and sales
    await prisma.saleItem.deleteMany({
      where: { saleId: { in: existingOrder.sales.map((s) => s.id) } },
    });
    await prisma.sale.deleteMany({ where: { orderId } });

    // Create new sales with saleItems
    const totalAmount = items.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0
    );

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount,
        paidAmount,
        paymentStatus,
        sales: {
          create: [
            {
              totalPrice: totalAmount,
              saleItems: {
                create: items.map((i: any) => ({
                  itemId: i.itemId,
                  bookId: i.bookId,
                  quantity: i.quantity,
                  price: i.price,
                })),
              },
            },
          ],
        },
      },
      include: { sales: { include: { saleItems: true } } },
    });

    // Deduct stock for new items
    for (const i of items) {
      if (i.itemId)
        await prisma.item.update({
          where: { id: i.itemId },
          data: { quantity: { decrement: i.quantity } },
        });
      if (i.bookId)
        await prisma.book.update({
          where: { id: i.bookId },
          data: { quantity: { decrement: i.quantity } },
        });
    }

    return NextResponse.json(updatedOrder);
  } catch (err: any) {
    console.error("❌ Error updating order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔴 DELETE order
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // 👈 params is a Promise
) {
  try {
    const { id } = await context.params; // 👈 await it
    const orderId = Number(id);

    if (!orderId) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { sales: { include: { saleItems: true } } },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Restore stock
    for (const sale of existingOrder.sales) {
      for (const si of sale.saleItems) {
        if (si.itemId)
          await prisma.item.update({
            where: { id: si.itemId },
            data: { quantity: { increment: si.quantity } },
          });
        if (si.bookId)
          await prisma.book.update({
            where: { id: si.bookId },
            data: { quantity: { increment: si.quantity } },
          });
      }
    }

    // Delete saleItems → sales → order
    await prisma.saleItem.deleteMany({
      where: { saleId: { in: existingOrder.sales.map((s) => s.id) } },
    });
    await prisma.sale.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });

    return NextResponse.json({ message: "Order deleted successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Error deleting order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

