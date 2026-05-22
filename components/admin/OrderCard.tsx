"use client";

import React, { useEffect, useState } from "react";
import { Clock, Bike, ShoppingBag } from "lucide-react";

export default function OrderCard({
  order,
  onProgress,
}: {
  order: any;
  onProgress: (id: string, next: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const ticketTime = new Date(order.created_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - ticketTime) / 60000));
    }, 10000);

    setElapsed(Math.floor((Date.now() - ticketTime) / 60000));
    return () => clearInterval(interval);
  }, [order.created_at]);

  const getNextStageDetails = (status: string) => {
    switch (status) {
      case "pending":
        return { text: "Accept Order", nextStatus: "accepted" };
      case "accepted":
        return { text: "Start Cooking", nextStatus: "preparing" };
      case "preparing":
        return { text: "Dispatch via Uber", nextStatus: "out_for_delivery" };
      case "out_for_delivery":
        return { text: "Complete Order", nextStatus: "delivered" };
      default:
        return null;
    }
  };

  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleDecline = async () => {
    setCancelling(true);
    try {
      const { declineAndRefundOrder } = await import("@/lib/actions/admin");
      await declineAndRefundOrder(order.id);
      const { toast } = await import("sonner");
      toast.success("Order declined and refund pipeline completed.");
    } catch (err: any) {
      const { toast } = await import("sonner");
      toast.error(err.message || "Failed to decline order.");
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const action = getNextStageDetails(order.status);

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-all duration-200 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between border-b border-zinc-800/60 pb-3 mb-3">
          <div>
            <span className="text-xs font-mono text-zinc-500 uppercase font-semibold tracking-wider">
              ID: #{order.id.substring(0, 4).toUpperCase()}
            </span>
            <h4 className="text-sm font-bold text-zinc-200 mt-0.5 truncate max-w-[140px]">
              {order.customer_name || "Guest User"}
            </h4>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                elapsed >= 15
                  ? "bg-red-500/10 text-red-400 animate-pulse border border-red-500/20"
                  : "bg-zinc-950 text-zinc-400 border border-zinc-800"
              }`}
            >
              <Clock className="h-3 w-3" /> {elapsed}m ago
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center gap-1">
              {order.delivery_mode === "delivery" ? (
                <Bike className="h-2.5 w-2.5" />
              ) : (
                <ShoppingBag className="h-2.5 w-2.5" />
              )}
              {order.delivery_mode}
            </span>
          </div>
        </div>

        {/* Dense Product Extraction Item List Array */}
        <div className="space-y-2 my-2 text-xs">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex items-start gap-2 text-zinc-300">
              <span className="font-mono font-bold text-zinc-500 bg-zinc-950 border border-zinc-850 px-1.5 py-0.2 rounded shrink-0">
                {item.quantity}x
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-250 truncate">
                  {item.item_name}
                </p>
                {item.selected_options && item.selected_options !== "[]" && (
                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                    {typeof item.selected_options === "string"
                      ? item.selected_options.replace(/[\[\]"]/g, "")
                      : Array.isArray(item.selected_options)
                      ? item.selected_options.join(", ")
                      : JSON.stringify(item.selected_options)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/40 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-mono font-bold text-zinc-400">
            £{Number(order.total).toFixed(2)}
          </span>
          
          {!confirmCancel ? (
            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="px-2.5 py-2 rounded-lg border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-all duration-150 cursor-pointer"
              >
                Decline
              </button>
              {action && (
                <button
                  onClick={() => onProgress(order.id, action.nextStatus)}
                  className="flex-1 text-center bg-zinc-50 text-zinc-950 font-bold text-xs py-2 px-3 rounded-lg hover:bg-white active:scale-[0.98] transition-all duration-150 cursor-pointer shadow"
                >
                  {action.text}
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleDecline}
                className="flex-1 text-center bg-red-600 text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-red-500 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {cancelling ? "Refunding..." : "Decline & Refund"}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmCancel(false)}
                className="px-3 py-2 rounded-lg border border-zinc-805 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
