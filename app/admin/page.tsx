"use client";

import React, { useEffect, useState } from "react";
import KanbanBoard from "@/components/admin/KanbanBoard";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .not("status", "in", '("delivered","cancelled")')
        .order("created_at", { ascending: true });

      if (!error && data) setOrders(data);
      setLoading(false);
    }

    fetchActiveOrders();

    // Wire up real-time socket events natively using supabase.channel
    const channel = supabase
      .channel("kds_orders_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchActiveOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top operational metrics section */}
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

      {/* Primary Kanban Area */}
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
