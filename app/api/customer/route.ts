import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ----------------------------
// GET /api/customer
// ----------------------------
export async function GET(req: NextRequest) {
  try {
    const { search, type, page = "1", limit = "1000" } = Object.fromEntries(
      req.nextUrl.searchParams
    );

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const pageLimit = parseInt(limit as string, 10) || 1000;

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (pageNum - 1) * pageLimit,
        take: pageLimit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 🚀 Disable caching here
    return NextResponse.json(
      { customers, total },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/customer error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

// ----------------------------
// POST /api/customer
// ----------------------------
export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, address, type } = await req.json();

    if (!name || !email || !type) {
      return NextResponse.json(
        { error: "Name, Email, and Type are required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: { name, email, phone, address, type },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("POST /api/customer error:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}