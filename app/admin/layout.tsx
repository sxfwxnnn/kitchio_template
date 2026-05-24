"use client";

import React from "react";
import { LayoutDashboard, ShoppingBag, Settings, LogOut, Utensils, BarChart3, Ticket, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-zinc-800 text-zinc-50 font-semibold border border-zinc-700/30"
        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
    }`;
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-50 antialiased font-sans">
      {/* Dense Utilitarian Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-900/50 flex flex-col justify-between shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-xl text-zinc-100">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold tracking-tight text-base leading-none">Kitchio Admin</h2>
              <p className="text-xs text-zinc-500 mt-1">Management Portal</p>
            </div>
          </div>
          
          <nav className="mt-8 space-y-1.5">
            <a href="/admin/dashboard" className={getLinkClass("/admin/dashboard")}>
              <ShoppingBag className="h-4 w-4" /> Live Orders
            </a>
            <a href="/admin/menu" className={getLinkClass("/admin/menu")}>
              <LayoutDashboard className="h-4 w-4" /> Menu Manager
            </a>
            <a href="/admin/coupons" className={getLinkClass("/admin/coupons")}>
              <Ticket className="h-4 w-4" /> Coupons & Promos
            </a>
            <a href="/admin/analytics" className={getLinkClass("/admin/analytics")}>
              <BarChart3 className="h-4 w-4" /> Analytics & Reports
            </a>
            <a href="/admin/settings" className={getLinkClass("/admin/settings")}>
              <Settings className="h-4 w-4" /> Restaurant Settings
            </a>
            <a href="/admin/connect" className={getLinkClass("/admin/connect")}>
              <CreditCard className="h-4 w-4" /> Stripe Connect
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-900">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/5 text-sm font-medium rounded-xl transition-colors duration-150 cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Screen Stream */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
