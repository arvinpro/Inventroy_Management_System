import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { email: email.trim() } });
    if (!admin) return NextResponse.json({ error: "Email not found" }, { status: 404 });

    // generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.admin.update({
      where: { id: admin.id },
      data: { resetToken: token, tokenExpiry: expiry },
    });

    // configure nodemailer for Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email.trim(),
      subject: "Password Reset",
      text: `Click here to reset your password: ${resetLink}`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password</p>`,
    });

    return NextResponse.json({ message: "Reset email sent" });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
