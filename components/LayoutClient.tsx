"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Bell, Menu, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { useSession, signOut } from "next-auth/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import axios from "axios";
import useSWR from "swr";

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // SWR: fetch low stock every 10s
  const { data: lowStock = [] } = useSWR(
    ["/api/books", "/api/items"],
    async () => {
      const [bRes, iRes] = await Promise.all([axios.get("/api/books"), axios.get("/api/items")]);
      const books = bRes.data.filter((b: any) => b.quantity <= 5)
        .map((b: any) => ({ id: b.id, name: b.title || b.name, quantity: b.quantity, type: "Book" }));
      const items = iRes.data.filter((i: any) => i.quantity <= 5)
        .map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity, type: "Item" }));
      return [...books, ...items];
    },
    { refreshInterval: 10000 } // 10s auto refresh
  );

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const authRoutes = ["/", "/login", "/register", "/forget-password"];
  const hideSidebar = authRoutes.includes(pathname);

  const role = session?.user?.role || "User";
  const email = session?.user?.email || "";

  const initials = role === "admin" ? "AD" : "ST";
  const avatarBg = role === "admin" ? "bg-blue-600" : "bg-green-600";

  return (
    <div className="flex min-h-screen bg-gradient-to-bl from-[#ffe4e6] to-[#ccfbf1]">
      {!hideSidebar && <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />}
      <div className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${!hideSidebar ? (collapsed ? "ml-20" : "ml-64") : ""}`}>
        {!hideSidebar && (
          <header className="flex items-center justify-between bg-gradient-to-r from-[#d1d5db] via-[#6b7280] to-[#000026] shadow-sm px-6 py-4">
            <div className="flex items-center space-x-4">
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 bg-gray-900 text-white">
                  <SheetHeader className="p-4 border-b border-gray-800"><h2 className="text-lg font-semibold">Menu</h2></SheetHeader>
                  <Sidebar collapsed={false} setCollapsed={() => {}} />
                </SheetContent>
              </Sheet>

              <h1 className="text-lg font-semibold hidden md:block">
                Welcome, {role === "admin" ? "Admin" : "Staff"}!
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Input placeholder="Search..." className="max-w-sm bg-white" />

              {/* Bell with low stock popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative p-2 rounded-full hover:bg-gray-100">
                    <Bell className="h-5 w-5 text-gray-400" />
                    {lowStock.length > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
                        {lowStock.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <h3 className="font-semibold mb-2">Low Stock Notifications</h3>
                  {lowStock.length === 0 ? (
                    <p className="text-sm text-gray-500">No low stock items</p>
                  ) : (
                    <ul className="space-y-1 max-h-64 overflow-y-auto">
                      {lowStock.map((item: any) => (
                        <li key={`${item.type}-${item.id}`} className="flex justify-between items-center border-b border-gray-200 py-1">
                          <Link
                            href={`/${item.type === "Book" ? "books" : "items"}/edit/${item.id}`}
                            className="flex-1 hover:underline text-sm font-medium"
                          >
                            {item.name} ({item.type})
                          </Link>
                          <span className={`font-medium ${item.quantity <= 2 ? "text-red-600" : "text-yellow-600"}`}>
                            {item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </PopoverContent>
              </Popover>

              {/* Avatar popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button>
                    <Avatar className={avatarBg}><AvatarFallback>{initials}</AvatarFallback></Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{role === "admin" ? "Admin" : "Staff"}</p>
                    <p className="text-xs text-gray-500 break-words">{email}</p>
                    <div className="border-t border-gray-200 my-2" />
                    <Link href="/settings">
                      <Button variant="ghost" className="w-full justify-start gap-2"><Settings className="h-4 w-4" /> Settings</Button>
                    </Link>
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => signOut({ callbackUrl: "/login" })}>
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
