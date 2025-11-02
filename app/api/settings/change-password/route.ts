import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6)
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (session.user.role === "admin") {
      await prisma.admin.update({
        where: { email: session.user.email! },
        data: { password: hashedPassword },
      });
    } else if (session.user.role === "staff") {
      await prisma.staff.update({
        where: { email: session.user.email! },
        data: { password: hashedPassword },
      });
    } else {
      return NextResponse.json({ message: "Invalid role" }, { status: 403 });
    }

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to update password" }, { status: 500 });
  }
}
