import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const validStatuses = ["PENDING", "PARTIAL", "PAID"] as const;

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        sales: {
          include: {
            saleItems: {
              include: {
                item: true,
                book: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, items, paidAmount, paymentStatus } = body;

    if (!customerId || !items || items.length === 0) {
      return NextResponse.json({ error: "Customer and items are required" }, { status: 400 });
    }

    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json({ error: "Invalid paymentStatus" }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

    // Create Order
    const order = await prisma.order.create({
      data: {
        customerId,
        totalAmount,
        paidAmount,
        paymentStatus,
        sales: {
          create: [
            {
              totalPrice: totalAmount,
              saleItems: {
                create: items.map((i: any) => ({
                  itemId: i.productType === "Item" ? i.itemId : undefined,
                  bookId: i.productType === "Book" ? i.bookId : undefined,
                  quantity: i.quantity,
                  price: i.price,
                })),
              },
            },
          ],
        },
      },
      include: {
        sales: { include: { saleItems: { include: { item: true, book: true } } } },
        customer: true,
      },
    });

    // Update stock
    for (const i of items) {
      if (i.productType === "Item") {
        await prisma.item.update({
          where: { id: i.itemId },
          data: { quantity: { decrement: i.quantity } },
        });
      } else if (i.productType === "Book") {
        await prisma.book.update({
          where: { id: i.bookId },
          data: { quantity: { decrement: i.quantity } },
        });
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    console.error("❌ Error creating order:", err);
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = Number(params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { sales: { include: { saleItems: true } } },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Restore stock before deleting
    for (const sale of order.sales) {
      for (const si of sale.saleItems) {
        if (si.itemId) {
          await prisma.item.update({
            where: { id: si.itemId },
            data: { quantity: { increment: si.quantity } },
          });
        }
        if (si.bookId) {
          await prisma.book.update({
            where: { id: si.bookId },
            data: { quantity: { increment: si.quantity } },
          });
        }
      }
    }

    await prisma.order.delete({ where: { id: orderId } });

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
