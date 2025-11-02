"use client"

import "./globals.css";
import ClientLayout from "@/components/LayoutClient";
import { Toaster } from "@/components/ui/sonner";
import { ReduxProvider } from "./Providers";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100">
        <ReduxProvider>
          <SessionProvider>
            <ClientLayout>{children}</ClientLayout>
          </SessionProvider>
        </ReduxProvider>

        <Toaster />
      </body>
    </html>
  );
}
