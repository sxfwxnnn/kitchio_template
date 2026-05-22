"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Order, OrderItem } from "@/types";
import Link from "next/link";
import { ArrowLeft, Package, Clock, ChevronRight, Calendar, ShoppingBag, Loader2 } from "lucide-react";

interface OrderWithItems extends Order {
  order_items?: OrderItem[];
}

export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as OrderWithItems[]);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "accepted":
      case "preparing":
      case "courier_arrived":
      case "out_for_delivery":
        return "bg-green-50 text-green-700 border-green-200/50 animate-pulse";
      case "delivered":
        return "bg-zinc-50 text-zinc-600 border-zinc-200/50";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200/50";
      default:
        return "bg-zinc-50 text-zinc-600 border-zinc-250";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-950 stroke-[1.5]" />
        <p className="mt-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Loading your history...</p>
      </div>
    );
  }

  // Not signed in state
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between">
        {/* Header */}
        <header className="border-b border-zinc-100 bg-white sticky top-0 z-10">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Menu</span>
            </Link>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">Kitchio</span>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-md w-full px-4 py-20 flex-1 flex flex-col justify-center text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 border border-zinc-200 shadow-sm">
            <Package className="h-6 w-6 text-zinc-400 stroke-[1.5]" />
          </div>
          <h1 className="text-md font-bold text-zinc-950 uppercase tracking-wider">
            Sign In to View Orders
          </h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed font-medium">
            Please sign in to your Kitchio account to see your past orders and active delivery tracking.
          </p>
          <Link
            href="/login?next=/orders"
            className="mt-6 inline-block w-full rounded-full bg-zinc-950 py-3 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition-colors shadow-md"
          >
            Sign In
          </Link>
        </main>
        
        {/* Footer */}
        <footer className="py-6 border-t border-zinc-100 bg-white">
          <p className="text-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Powered by Kitchio
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-zinc-100 bg-white sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Menu</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">My Orders</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl w-full px-4 py-8 flex-1">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 border border-zinc-150 shadow-sm">
              <ShoppingBag className="h-6 w-6 text-zinc-400 stroke-[1.5]" />
            </div>
            <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
              No orders found
            </h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed max-w-[260px] font-medium mx-auto">
              Curate your gourmet selection and place your first order with us.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-zinc-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition-colors shadow"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const active = ["pending", "accepted", "preparing", "courier_arrived", "out_for_delivery"].includes(order.status);
              
              // Build string summary of items
              const itemSummary = order.order_items
                ? order.order_items.map(item => `${item.quantity}x ${item.item_name}`).join(", ")
                : "View items";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-zinc-150 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-zinc-300 transition-all duration-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Order</span>
                        <span className="text-xs font-mono font-bold text-zinc-900">#{order.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-zinc-100 bg-zinc-50/50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                        {order.delivery_mode}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="py-4">
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1.5">Selected Items</p>
                    <p className="text-xs text-zinc-700 font-medium line-clamp-2 leading-relaxed">
                      {itemSummary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Paid</p>
                      <p className="text-sm font-bold text-zinc-950 font-serif mt-0.5">£{order.total.toFixed(2)}</p>
                    </div>

                    <Link
                      href={`/orders/${order.id}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        active
                          ? "bg-zinc-950 text-white hover:bg-zinc-800 shadow"
                          : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
                      }`}
                    >
                      <span>{active ? "Track Live" : "View Receipt"}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-100 bg-white">
        <p className="text-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
          Powered by Kitchio
        </p>
      </footer>
    </div>
  );
}
