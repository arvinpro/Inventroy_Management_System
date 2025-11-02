import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parsedId = parseInt(params.id, 10);
    if (!parsedId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { name, email, phone, address, type } = await req.json();

    if (!name || !email || !type) {
      return NextResponse.json(
        { error: "Name, Email, and Type are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id: parsedId },
      data: { name, email, phone, address, type },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/customer/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// ----------------------------
// DELETE /api/customer/[id]
// ----------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parsedId = parseInt(params.id, 10);
    if (!parsedId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Check for linked orders
    const linkedOrders = await prisma.order.count({ where: { customerId: parsedId } });
    if (linkedOrders > 0) {
      return NextResponse.json(
        { error: "Cannot delete this customer because they have linked orders." },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id: parsedId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/customer/[id] error:", error);

    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete customer with existing orders or sales." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete customer. Please try again." },
      { status: 500 }
    );
  }
}