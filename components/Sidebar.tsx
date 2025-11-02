"use client";

import Link from "next/link";
import {
  LayoutDashboard, Warehouse, Users, Settings, LogOut,
  ChevronRight, NotebookText, BadgeDollarSign, ClipboardMinus, BetweenHorizontalEnd
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Inventory",
    href: "/books",
    icon: Warehouse,
    subItems: [
      { name: "Add Book", href: "/books" },
      { name: "Add Items", href: "/items" },
    ],
  },
  { name: "Categories", href: "/category", icon: NotebookText },
  { name: "Customers / Retailers", href: "/customers", icon: Users },
  { name: "Orders / Sales", href: "orders", icon: BadgeDollarSign },
  { name: "Reports", href: "reports", icon: ClipboardMinus },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const [inventoryOpen, setInventoryOpen] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 flex flex-col z-40",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && <h1 className="text-lg font-semibold">📚 ICT Bookstore</h1>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          <BetweenHorizontalEnd className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.subItems) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => setInventoryOpen(!inventoryOpen)}
                  className={cn(
                    "flex items-center w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800",
                    collapsed ? "justify-center" : "gap-3"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!collapsed && (
                    <>
                      {item.name}
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          inventoryOpen && "rotate-90"
                        )}
                      />
                    </>
                  )}
                </button>

                {!collapsed && inventoryOpen && (
                  <div className="ml-6 mt-1 flex flex-col space-y-1">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded-lg"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800",
                collapsed ? "justify-center" : "gap-3"
              )}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <Button
          variant="destructive"
          className={cn("w-full flex items-center justify-center gap-2", collapsed && "justify-center")}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </aside>
  );
}
