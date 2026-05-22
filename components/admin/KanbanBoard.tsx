"use client";

import React, { useCallback } from "react";
import OrderCard from "./OrderCard";
import { updateOrderStatus } from "@/lib/actions/admin";
import { toast } from "sonner";

interface KanbanBoardProps {
  orders: any[];
  setOrders: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function KanbanBoard({ orders, setOrders }: KanbanBoardProps) {
  const handleMoveStage = useCallback(
    async (orderId: string, nextStatus: string) => {
      // Optimistic UI updates to make the pipeline feel instant
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );

      try {
        await updateOrderStatus(orderId, nextStatus);
        toast.success(`Order #${orderId.substring(0, 4).toUpperCase()} updated successfully.`);
      } catch (err) {
        toast.error("Failed to commit status change onto remote databases.");
      }
    },
    [setOrders]
  );

  const columns = [
    {
      title: "New Tickets",
      statusKey: "pending",
      styles: "border-blue-500/10 text-blue-400 bg-blue-500/5",
    },
    {
      title: "In Kitchen",
      statusKey: "preparing",
      styles: "border-amber-500/10 text-amber-400 bg-amber-500/5",
    },
    {
      title: "Ready / Dispatched",
      statusKey: "out_for_delivery",
      styles: "border-emerald-500/10 text-emerald-400 bg-emerald-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start min-w-[900px]">
      {columns.map((col) => {
        const filtered = orders.filter((o) => {
          if (col.statusKey === "preparing")
            return o.status === "accepted" || o.status === "preparing";
          return o.status === col.statusKey;
        });

        return (
          <div
            key={col.statusKey}
            className="flex flex-col max-h-full bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4 overflow-hidden"
          >
            <div
              className={`flex items-center justify-between p-3 border-b border-zinc-900 mb-4 rounded-xl ${col.styles}`}
            >
              <h3 className="text-sm font-bold tracking-tight uppercase">
                {col.title}
              </h3>
              <span className="text-xs font-mono font-bold bg-zinc-950/50 px-2 py-0.5 rounded-md">
                {filtered.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="h-32 flex items-center justify-center border border-dashed border-zinc-900 rounded-xl text-xs text-zinc-650 font-mono">
                  No active tickets
                </div>
              ) : (
                filtered.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onProgress={handleMoveStage}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
