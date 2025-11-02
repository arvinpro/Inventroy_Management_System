import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    const admin = await prisma.admin.findFirst({
      where: {
        resetToken: token,
        tokenExpiry: { gte: new Date() }, // valid token
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        tokenExpiry: null,
      },
    });

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
