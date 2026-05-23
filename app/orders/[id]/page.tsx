"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Order, OrderItem, OrderStatus } from "@/types";
import OrderTracker from "@/components/OrderTracker";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Loader2, Phone, User, ExternalLink, Truck, ShieldCheck } from "lucide-react";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch order
  useEffect(() => {
    const supabase = createClient();

    async function fetchOrder() {
      try {
        const { getGuestOrder } = await import("@/lib/actions/orders");
        const { order: data, error } = await getGuestOrder(orderId);

        if (error || !data) {
          setError(error || "Order not found");
          setLoading(false);
          return;
        }

        setOrder(data as any);
        setItems((data.items || []) as OrderItem[]);
        setLoading(false);
      } catch (err) {
        setError("Failed to load order");
        setLoading(false);
      }
    }

    fetchOrder();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) =>
            prev ? { ...prev, ...payload.new } as Order : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight font-serif">Order not found</h1>
          <p className="mt-2 text-sm text-zinc-500">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition-colors shadow"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 pb-12">
      {/* Premium monochrome Header */}
      <div className="border-b border-zinc-150/40 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-950 transition-colors mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Menu
          </Link>
          <h1 className="font-serif text-lg font-bold text-zinc-950 tracking-tight leading-none">Order Tracking</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        
        {/* Live Uber Direct Tracking Card */}
        {order.uber_tracking_url && (
          <div className="rounded-2xl border border-zinc-150/40 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] animate-in slide-in-from-top-2 duration-300">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Live Uber Tracking</h2>
            <p className="text-xs text-zinc-500 mb-4 font-medium leading-relaxed">
              Your delivery is powered by Uber Direct. Click the secure tracking link below to watch your courier live on the map.
            </p>
            <a
              href={order.uber_tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-805 transition-all duration-200 shadow-md active:scale-[0.99] cursor-pointer"
            >
              <Truck className="h-4 w-4 text-emerald-400" />
              Track Live on Uber
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>
          </div>
        )}

        {/* Courier Details Card */}
        {(order.courier_name || order.courier_phone) && (
          <div className="rounded-2xl border border-zinc-150/40 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] animate-in slide-in-from-top-2 duration-300">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Courier Information</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-50 border border-zinc-150 shadow-inner">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Uber Direct Courier</p>
                  <p className="text-sm font-bold text-zinc-900 mt-0.5">{order.courier_name || "Assigned Courier"}</p>
                </div>
              </div>
              
              {order.courier_phone && (
                <a
                  href={`tel:${order.courier_phone}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 hover:border-zinc-950 text-zinc-500 hover:text-zinc-950 transition-all active:scale-90 shadow-sm"
                  title="Call Courier"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Status Tracker */}
        <div className="rounded-2xl border border-zinc-150/40 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5 mb-5">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Order Journey</h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                Placed at{" "}
                {new Date(order.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <OrderTracker currentStatus={order.status as OrderStatus} />
        </div>

        {/* Delivery info */}
        {order.delivery_address && (
          <div className="rounded-2xl border border-zinc-150/40 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
            <div className="flex items-start gap-3">
              <MapPin className="h-4.5 w-4.5 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Destination Address
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 leading-normal">
                  {order.delivery_address}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-2xl border border-zinc-150/40 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-3.5 mb-4">
            Items Curated
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-705">
                  {item.quantity}x <span className="text-zinc-900 font-bold ml-1">{item.item_name}</span>
                </span>
                <span className="text-zinc-950 font-serif">
                  £{Number(item.total_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-4 space-y-2">
            <div className="flex justify-between text-xs text-zinc-500 font-medium">
              <span>Subtotal</span>
              <span className="font-serif text-zinc-900">£{Number(order.subtotal).toFixed(2)}</span>
            </div>
            {Number(order.delivery_fee) > 0 ? (
              <div className="flex justify-between text-xs text-zinc-500 font-medium">
                <span>Delivery Fee</span>
                <span className="font-serif text-zinc-900">£{Number(order.delivery_fee).toFixed(2)}</span>
              </div>
            ) : (
              order.delivery_mode === "delivery" && (
                <div className="flex justify-between text-xs text-zinc-500 font-medium">
                  <span>Delivery Fee</span>
                  <span className="text-zinc-900 font-bold uppercase tracking-wider text-[9px]">Free</span>
                </div>
              )
            )}
            
            {/* Show implied discount if subtotal + deliveryFee !== total */}
            {Math.abs(Number(order.subtotal) + Number(order.delivery_fee) - Number(order.total)) > 0.01 && (
              <div className="flex justify-between text-xs font-bold text-green-700 bg-green-50/50 py-0.5 px-1 rounded">
                <span>Promo Discount Applied</span>
                <span className="font-serif">-£{Math.max(0, Number(order.subtotal) + Number(order.delivery_fee) - Number(order.total)).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-dashed border-zinc-150 pt-3 mt-3 text-sm font-bold text-zinc-950">
              <span>Total Paid</span>
              <span className="font-serif text-zinc-950 text-base">£{Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Security & Order ID */}
        <div className="flex flex-col items-center gap-2 mt-4 justify-center">
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
            <span>Kitchio Verified Order</span>
          </div>
          <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Order ID: {order.id}
          </p>
        </div>
      </div>
    </div>
  );
}
