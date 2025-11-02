import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { newEmail } = body;

    if (!newEmail) return NextResponse.json({ message: "New email required" }, { status: 400 });

    // Determine if user is admin or staff
    if (session.user.role === "admin") {
      // Update admin email
      await prisma.admin.update({
        where: { email: session.user.email! },
        data: { email: newEmail },
      });
    } else if (session.user.role === "staff") {
      // Update staff email
      await prisma.staff.update({
        where: { email: session.user.email! },
        data: { email: newEmail },
      });
    } else {
      return NextResponse.json({ message: "Invalid role" }, { status: 403 });
    }

    return NextResponse.json({ message: "Email updated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to update email" }, { status: 500 });
  }
}
