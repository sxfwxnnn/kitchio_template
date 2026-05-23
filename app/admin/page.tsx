"use client";

import React, { useEffect, useState } from "react";
import KanbanBoard from "@/components/admin/KanbanBoard";
import { createClient } from "@/lib/supabase/client";
import { Shield, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "ok" | "not_logged_in" | "not_admin">("checking");

  useEffect(() => {
    async function checkAuthAndLoad() {
      // 1. Check if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState("not_logged_in");
        setLoading(false);
        return;
      }

      // 2. Check if in admin_users table
      const { data: adminProfile } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!adminProfile) {
        setAuthState("not_admin");
        setLoading(false);
        return;
      }

      setAuthState("ok");

      async function fetchActiveOrders() {
        const { data, error } = await supabase
          .from("orders")
          .select(`*, order_items (*)`)
          .not("status", "in", '("delivered","cancelled")')
          .order("created_at", { ascending: true });

        if (!error && data) setOrders(data);
        setLoading(false);
      }

      fetchActiveOrders();

      const channel = supabase
        .channel("kds_orders_live")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
          fetchActiveOrders();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    checkAuthAndLoad();
  }, []);

  // ── Not logged in ──────────────────────────────────────────────────────
  if (authState === "checking") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-3" />
        <p className="text-sm font-mono">Verifying credentials...</p>
      </div>
    );
  }

  if (authState === "not_logged_in") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5">
            <Shield className="h-6 w-6 text-red-400" />
          </div>
          <h1 className="text-lg font-bold">Not signed in</h1>
          <p className="text-sm text-zinc-400 mt-2 mb-6">
            You need to log in before accessing the admin panel.
          </p>
          <Link
            href="/login?next=/admin"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-950 hover:bg-white transition-all cursor-pointer"
          >
            Sign In <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (authState === "not_admin") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5">
            <Shield className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-lg font-bold">Not an admin</h1>
          <p className="text-sm text-zinc-400 mt-2 mb-6">
            Your account hasn't been promoted to admin yet.
          </p>
          <Link
            href="/admin-setup"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-all cursor-pointer"
          >
            Go to Admin Setup <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Authenticated Admin View ───────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 border-b border-zinc-900 px-8 flex items-center justify-between shrink-0 bg-zinc-950">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight">Kitchen Operations</h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />
            Live Syncing
          </div>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          Active: {orders.length} tickets
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-8 bg-zinc-950/40">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm font-mono animate-pulse">
            Booting KDS Monitor Stream...
          </div>
        ) : (
          <KanbanBoard orders={orders} setOrders={setOrders} />
        )}
      </div>
    </div>
  );
}
