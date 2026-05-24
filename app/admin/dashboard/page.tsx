"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Clock,
  Printer,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Lock,
  Unlock,
  LogOut,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Restaurant } from "@/types";

export default function AdminDashboardPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantSettings, setRestaurantSettings] = useState<any>({
    temporarily_closed: false,
    closed_message: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "delivery" | "collection" | "preorder">("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Realtime notification states
  const [newOrderCount, setNewOrderCount] = useState(0);
  const previousOrdersLength = useRef<number | null>(null);
  
  // Web Audio Synth chime
  const playBellChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Note 1: F5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(698.46, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Note 2: A5 (offset slightly for bell resonance)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (err) {
      console.warn("Audio chime syntax error context blocked:", err);
    }
  };

  // Fetch orders & settings
  const fetchData = async () => {
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("restaurant_settings")
          .select("*")
          .eq("restaurant_slug", "marios-pizza")
          .single(),
      ]);

      if (ordersRes.data) {
        setOrders(ordersRes.data);
        
        // Listen for new orders and play audio chime
        if (previousOrdersLength.current !== null && ordersRes.data.length > previousOrdersLength.current) {
          const addedCount = ordersRes.data.length - previousOrdersLength.current;
          setNewOrderCount((c) => c + addedCount);
          playBellChime();
          toast.success(`🆕 ${addedCount} New order ticket arrived!`);
        }
        previousOrdersLength.current = ordersRes.data.length;
      }
      
      if (settingsRes.data) {
        setRestaurantSettings(settingsRes.data);
      }
    } catch (err) {
      console.error("Data load failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime orders updates
    const ordersChannel = supabase
      .channel("admin_orders_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  // Update browser tab title based on new orders
  useEffect(() => {
    if (newOrderCount > 0) {
      document.title = `(${newOrderCount}) New Order! — Kitchio Admin`;
    } else {
      document.title = "Kitchio Admin Dashboard";
    }
  }, [newOrderCount]);

  // Handle open/closed toggle settings update
  const handleToggleClosed = async (closed: boolean) => {
    try {
      const updated = {
        ...restaurantSettings,
        temporarily_closed: closed,
        closed_message: closed ? restaurantSettings.closed_message || "Back at 6pm - sorry for the inconvenience!" : "",
      };
      
      setRestaurantSettings(updated);

      const { error } = await supabase
        .from("restaurant_settings")
        .upsert({
          restaurant_slug: "marios-pizza",
          temporarily_closed: closed,
          closed_message: updated.closed_message,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success(closed ? "Restaurant set to CLOSED" : "Restaurant set to OPEN");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
  };

  const handleClosedMessageChange = async (msg: string) => {
    setRestaurantSettings((prev: any) => ({ ...prev, closed_message: msg }));
    try {
      await supabase
        .from("restaurant_settings")
        .update({ closed_message: msg })
        .eq("restaurant_slug", "marios-pizza");
    } catch (err) {
      console.warn("Closed message sync failed:", err);
    }
  };

  // Status progression action triggers
  const handleProgressStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = "confirmed";
    if (currentStatus === "pending_payment" || currentStatus === "paid") nextStatus = "confirmed";
    else if (currentStatus === "confirmed") nextStatus = "preparing";
    else if (currentStatus === "preparing") nextStatus = "out_for_delivery";
    else if (currentStatus === "out_for_delivery") nextStatus = "delivered";
    else return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      
      // Update selected order details view if open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: nextStatus }));
      }
      
      // Reset new count alert if confirming a new ticket
      if (currentStatus === "paid" || currentStatus === "pending_payment") {
        setNewOrderCount((c) => Math.max(0, c - 1));
      }

      toast.success(`Order progressed to ${nextStatus}`);
    } catch (err: any) {
      toast.error("Failed to progress order status: " + err.message);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter((o) => o.created_at.startsWith(todayStr) && o.status !== "pending_payment");
    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const avgValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
    const pendingCount = orders.filter((o) => o.status === "paid").length;

    return {
      todayCount: todayOrders.length,
      revenue: todayRevenue,
      average: avgValue,
      pending: pendingCount,
    };
  }, [orders]);

  // Hourly Revenue chart mapping via Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset canvas sizing
    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = 180;

    const width = canvas.width;
    const height = canvas.height;

    // Get hourly revenue groupings
    const hourlyData: Record<number, number> = {};
    for (let h = 12; h <= 22; h++) hourlyData[h] = 0; // standard hours 12pm - 10pm

    const todayStr = new Date().toISOString().split("T")[0];
    orders
      .filter((o) => o.created_at.startsWith(todayStr) && o.status !== "pending_payment")
      .forEach((o) => {
        const orderHour = new Date(o.created_at).getHours();
        if (orderHour >= 12 && orderHour <= 22) {
          hourlyData[orderHour] += Number(o.total || 0);
        }
      });

    // Drawing parameters
    ctx.clearRect(0, 0, width, height);
    const hoursKeys = Object.keys(hourlyData).map(Number);
    const maxVal = Math.max(...Object.values(hourlyData), 50); // min ceiling £50
    const padding = 35;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    const barWidth = graphWidth / hoursKeys.length - 8;

    // Drawing Bars
    hoursKeys.forEach((hr, idx) => {
      const rev = hourlyData[hr];
      const barHeight = (rev / maxVal) * graphHeight;
      const x = padding + idx * (graphWidth / hoursKeys.length) + 4;
      const y = height - padding - barHeight;

      // Draw background bar pill track
      ctx.fillStyle = "#1e1e24";
      ctx.beginPath();
      ctx.roundRect(x, padding, barWidth, graphHeight, 4);
      ctx.fill();

      // Draw active revenue bar
      if (rev > 0) {
        ctx.fillStyle = "#FF5C1A"; // Brand Kitchio Orange
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
        
        // Write value above bar
        ctx.fillStyle = "#FAF9F6";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`£${rev.toFixed(0)}`, x + barWidth / 2, y - 6);
      }

      // X Axis Label hours
      ctx.fillStyle = "#78716C";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      const ampm = hr >= 12 ? (hr === 12 ? "12pm" : `${hr - 12}pm`) : `${hr}am`;
      ctx.fillText(ampm, x + barWidth / 2, height - padding + 16);
    });
  }, [orders]);

  // Compute Elapsed Time helper
  const getElapsedTime = (createdStr: string) => {
    const ticketTime = new Date(createdStr).getTime();
    const elapsed = Math.floor((Date.now() - ticketTime) / 60000);
    return elapsed;
  };

  // Search & Filters Kanban compute
  const processedOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.postcode?.toLowerCase().includes(q);

      // 2. Mode filter
      if (!matchSearch) return false;
      if (filterMode === "all") return true;
      if (filterMode === "delivery") return o.mode === "delivery";
      if (filterMode === "collection") return o.mode === "collection";
      if (filterMode === "preorder") return !!o.scheduled_for;
      return true;
    });
  }, [orders, searchQuery, filterMode]);

  // Columns Mapping for Kanban
  const kanbanColumns = [
    { title: "🆕 New Orders", statusKeys: ["pending_payment", "paid"] },
    { title: "✅ Confirmed", statusKeys: ["confirmed"] },
    { title: "👨🍳 Preparing", statusKeys: ["preparing"] },
    { title: "🚗 Out for Delivery", statusKeys: ["out_for_delivery", "ready_for_collection"] },
    { title: "✓ Done", statusKeys: ["delivered", "collected", "cancelled"] },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 antialiased font-sans">
      
      {/* 1. Header Operations */}
      <header className="h-16 border-b border-zinc-900 px-6 flex items-center justify-between shrink-0 bg-zinc-950 relative">
        <div className="flex items-center gap-3">
          <img src="/kitchio-logo-dark.png" className="h-6 object-contain" alt="Kitchio Logo" />
          <span className="h-4 w-[1px] bg-zinc-800" />
          <h1 className="text-sm font-bold uppercase tracking-wider text-zinc-200">Mario's Pizza</h1>
          
          {/* Live Open/Closed indicator dot */}
          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold">
            <span className={`h-1.5 w-1.5 rounded-full ${restaurantSettings.temporarily_closed ? "bg-rose-500" : "bg-emerald-500 animate-ping"}`} />
            <span className={restaurantSettings.temporarily_closed ? "text-rose-400" : "text-emerald-400"}>
              {restaurantSettings.temporarily_closed ? "CLOSED" : "OPEN"}
            </span>
          </div>
        </div>

        {/* Realtime Alert & Clear count triggers */}
        <div className="flex items-center gap-4">
          {newOrderCount > 0 && (
            <button
              onClick={() => setNewOrderCount(0)}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5C1A]/10 border border-[#FF5C1A]/20 text-[#FF5C1A] text-xs font-bold animate-pulse cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{newOrderCount} New Ticket Alert</span>
            </button>
          )}

          <button
            onClick={() => {
              supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Panel Content Scroll */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[calc(100vh-64px)]">
        
        {/* Top Segment layout: Controls and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Open/Closed Operations Card */}
          <div className="lg:col-span-1 bg-zinc-900/60 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Temporarily Closed Switch</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Toggle instant banner updates online</p>
              </div>
              <button
                onClick={() => handleToggleClosed(!restaurantSettings.temporarily_closed)}
                className={`flex h-8 w-16 items-center rounded-full p-1 cursor-pointer transition-colors border-none ${
                  restaurantSettings.temporarily_closed ? "bg-rose-600 justify-end" : "bg-emerald-600 justify-start"
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-white shadow flex items-center justify-center">
                  {restaurantSettings.temporarily_closed ? <Lock className="h-3 w-3 text-rose-600" /> : <Unlock className="h-3 w-3 text-emerald-600" />}
                </div>
              </button>
            </div>
            
            {restaurantSettings.temporarily_closed && (
              <div className="mt-4 animate-fade-in space-y-1.5">
                <label className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Custom Closed Banner Message</label>
                <input
                  type="text"
                  value={restaurantSettings.closed_message || ""}
                  onChange={(e) => handleClosedMessageChange(e.target.value)}
                  placeholder="e.g. Back at 6pm — sorry for the inconvenience!"
                  className="w-full h-9 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold placeholder-zinc-700 focus:border-rose-500 focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-900 rounded-2xl p-4.5 flex flex-col justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">Today's Orders</span>
              <p className="text-2xl font-extrabold text-zinc-100 mt-2">{stats.todayCount}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-900 rounded-2xl p-4.5 flex flex-col justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">Today's Revenue</span>
              <p className="text-2xl font-extrabold text-[#FF5C1A] mt-2 font-serif">£{stats.revenue.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-900 rounded-2xl p-4.5 flex flex-col justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">Avg Ticket Value</span>
              <p className="text-2xl font-extrabold text-zinc-100 mt-2 font-serif">£{stats.average.toFixed(2)}</p>
            </div>
            <div className={`border rounded-2xl p-4.5 flex flex-col justify-between transition-colors ${
              stats.pending > 0 ? "bg-[#FF5C1A]/10 border-[#FF5C1A]/35 text-[#FF5C1A]" : "bg-zinc-900/60 border-zinc-900 text-zinc-400"
            }`}>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-current">Pending Now</span>
              <p className="text-2xl font-extrabold text-zinc-100 mt-2">{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* 2. Searching and Filter Operations bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4">
          {/* Search */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, postcode..."
              className="w-full h-9 rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-4 text-xs font-semibold placeholder-zinc-700 focus:border-[#FF5C1A] focus:outline-none transition-colors"
            />
          </div>

          {/* Mode Filters */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-none">
            {[
              { value: "all", label: "All Tickets" },
              { value: "delivery", label: "Deliveries" },
              { value: "collection", label: "Collections" },
              { value: "preorder", label: "Pre-Orders" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterMode(f.value as any)}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border select-none ${
                  filterMode === f.value
                    ? "bg-[#FF5C1A] border-[#FF5C1A] text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Kanban Order Pipeline */}
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory h-[480px]">
          {kanbanColumns.map((col) => {
            const colOrders = processedOrders.filter((o) => col.statusKeys.includes(o.status));
            
            return (
              <div
                key={col.title}
                className="flex-1 min-w-[280px] max-h-full bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 flex flex-col snap-start"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4 shrink-0">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">
                    {col.title}
                  </h3>
                  <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-full font-bold text-[#FF5C1A]">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
                  {colOrders.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border border-dashed border-zinc-850 rounded-xl text-[10px] font-mono text-zinc-700">
                      No tickets
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const elapsed = getElapsedTime(order.created_at);
                      const isOverdue = order.status === "paid" && elapsed > 15;
                      
                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`bg-zinc-900/80 border rounded-xl p-3.5 hover:border-[#FF5C1A]/40 transition-colors shadow-lg cursor-pointer flex flex-col justify-between ${
                            isOverdue
                              ? "border-rose-500/40 bg-rose-500/5 animate-pulse"
                              : "border-zinc-850"
                          }`}
                        >
                          <div>
                            {/* Header row */}
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[10px] font-mono font-bold text-zinc-500">
                                #{order.id.substring(0, 4).toUpperCase()}
                              </span>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                isOverdue ? "bg-rose-500/10 text-rose-400" : "bg-zinc-950 text-zinc-400"
                              }`}>
                                {elapsed}m ago
                              </span>
                            </div>

                            {/* Customer & Badges */}
                            <div className="mt-2.5">
                              <h4 className="text-xs font-bold text-zinc-200 truncate">
                                {order.customer_name}
                              </h4>
                              
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.2 rounded-md ${
                                  order.mode === "delivery" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                  {order.mode}
                                </span>
                                {order.scheduled_for && (
                                  <span className="text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                    ⏰ PRE-ORDER
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Item Summaries */}
                            <p className="mt-3 text-[11px] text-zinc-500 font-semibold leading-relaxed line-clamp-2">
                              {/* Display simple items mapping */}
                              {Array.isArray(order.items)
                                ? order.items.map((i: any) => `${i.name} x${i.quantity}`).join(", ")
                                : "No items listed"}
                            </p>
                          </div>

                          {/* Footer row */}
                          <div className="flex justify-between items-center border-t border-zinc-850/50 pt-2.5 mt-3 select-none">
                            <span className="text-[10px] text-zinc-650 truncate max-w-[120px]">
                              {order.mode === "delivery" ? order.postcode || "No Postcode" : "Collection"}
                            </span>
                            <span className="text-xs font-extrabold text-[#FF5C1A] font-serif">
                              £{Number(order.total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Canvas Revenue Bar Chart */}
        <div className="bg-zinc-900/60 border border-zinc-900 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hourly Revenue Overview</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Vanilla JS canvas Hourly orders revenue for today</p>
          </div>
          <div className="relative w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 overflow-x-auto scrollbar-none">
            <canvas ref={canvasRef} className="mx-auto block" />
          </div>
        </div>
      </div>

      {/* 5. Right Slide-Out Details Panel */}
      {selectedOrder && (
        <>
          {/* Panel Backdrop */}
          <div
            className="fixed inset-0 z-[1000] bg-black/55 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Details Card Slider */}
          <div className="fixed right-0 top-0 bottom-0 z-[1050] w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-fade-in text-zinc-100">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-5">
                <div>
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Order Details</span>
                  <h2 className="text-sm font-bold text-zinc-150 mt-1 uppercase">
                    Ticket #{selectedOrder.id.substring(0, 8).toUpperCase()}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer border-none bg-transparent"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Order Status details */}
              <div className="flex justify-between items-center bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl mb-5">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Current Status:</span>
                <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#FF5C1A] bg-[#FF5C1A]/10 px-2.5 py-0.5 rounded border border-[#FF5C1A]/15">
                  {selectedOrder.status}
                </span>
              </div>

              {/* Special Instructions warning box if present */}
              {selectedOrder.special_instructions && (
                <div className="bg-amber-500/10 border border-amber-500/25 px-4 py-3 rounded-xl mb-5 text-amber-500 font-semibold italic text-xs leading-relaxed flex gap-2">
                  <span className="text-base select-none mt-0.5">💬</span>
                  <div>
                    <p className="font-extrabold uppercase tracking-wider text-[9px] not-italic text-amber-500">Special Instructions:</p>
                    <p className="mt-0.5">"{selectedOrder.special_instructions}"</p>
                  </div>
                </div>
              )}

              {/* Customer segments */}
              <div className="space-y-3.5 border-b border-zinc-800 pb-5 mb-5 text-xs">
                <h4 className="font-extrabold uppercase tracking-widest text-[9px] text-zinc-500">Customer Details</h4>
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <User className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="font-bold">{selectedOrder.customer_name}</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="truncate">{selectedOrder.customer_email}</span>
                </div>
                <a
                  href={`tel:${selectedOrder.customer_phone}`}
                  className="flex items-center gap-2.5 text-zinc-300 hover:text-[#FF5C1A] transition-colors"
                >
                  <Phone className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="font-mono font-semibold">{selectedOrder.customer_phone}</span>
                </a>
              </div>

              {/* Delivery Address Segment */}
              {selectedOrder.mode === "delivery" && selectedOrder.delivery_address && (
                <div className="space-y-3.5 border-b border-zinc-800 pb-5 mb-5 text-xs">
                  <h4 className="font-extrabold uppercase tracking-widest text-[9px] text-zinc-500">Delivery Location</h4>
                  <div className="flex items-start gap-2.5 text-zinc-300">
                    <MapPin className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{selectedOrder.delivery_address}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.delivery_address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#FF5C1A] hover:underline font-bold"
                  >
                    Open in Maps <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3 border-b border-zinc-800 pb-5 mb-5 text-xs">
                <h4 className="font-extrabold uppercase tracking-widest text-[9px] text-zinc-500">Ordered Items</h4>
                <div className="divide-y divide-zinc-850">
                  {selectedOrder.items && Array.isArray(selectedOrder.items) ? (
                    selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-2.5 text-zinc-200">
                        <div>
                          <p className="font-bold">
                            {item.name} <span className="text-[#FF5C1A] font-mono">x{item.quantity}</span>
                          </p>
                          {item.selectedOptions?.map((o: any, oIdx: number) => (
                            <p key={oIdx} className="text-[10px] text-zinc-500 mt-0.5">+ {o.optionName}</p>
                          ))}
                          {item.selectedExtras?.map((e: any, eIdx: number) => (
                            <p key={eIdx} className="text-[10px] text-zinc-500 mt-0.5">+ {e.name}</p>
                          ))}
                        </div>
                        <span className="font-mono font-semibold">£{Number(item.totalPrice || 0).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-600 italic">No item arrays found</p>
                  )}
                </div>
              </div>

              {/* Summary totals */}
              <div className="space-y-2 border-b border-zinc-800 pb-5 mb-5 text-xs text-zinc-400 select-none">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-200">£{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                {selectedOrder.mode === "delivery" && (
                  <div className="flex justify-between">
                    <span>Delivery fee</span>
                    <span className="font-mono text-zinc-200">£{Number(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedOrder.loyalty_discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-500 font-bold">
                    <span>Loyalty discount applied</span>
                    <span className="font-mono">− £{Number(selectedOrder.loyalty_discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-zinc-100 border-t border-dashed border-zinc-850 pt-2.5">
                  <span>Grand Total</span>
                  <span className="font-mono text-[#FF5C1A]">£{Number(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Print & Action triggers */}
            <div className="space-y-3 pt-4 select-none shrink-0">
              <button
                onClick={handlePrintTicket}
                className="w-full h-11 rounded-xl border border-zinc-850 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4.5 w-4.5" />
                <span>Print Ticket</span>
              </button>

              {selectedOrder.status !== "delivered" && selectedOrder.status !== "collected" && selectedOrder.status !== "cancelled" && (
                <button
                  onClick={() => handleProgressStatus(selectedOrder.id, selectedOrder.status)}
                  className="w-full h-11 rounded-xl bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <span>
                    {selectedOrder.status === "paid" || selectedOrder.status === "pending_payment"
                      ? "Confirm Order"
                      : selectedOrder.status === "confirmed"
                      ? "Start Preparing"
                      : selectedOrder.status === "preparing"
                      ? "Out for Delivery"
                      : selectedOrder.status === "out_for_delivery"
                      ? "Mark Delivered"
                      : "Progress Status"}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
