"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  createPromoCodeAction, 
  deletePromoCodeAction, 
  togglePromoCodeStatusAction 
} from "@/lib/actions/admin";
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Calendar, 
  Coins, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { toast } from "sonner";

export default function AdminCouponsPage() {
  const supabase = createClient();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authState, setAuthState] = useState<"checking" | "ok" | "not_admin">("checking");

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [amount, setAmount] = useState("");
  const [minOrder, setMinOrder] = useState("0");
  const [expiry, setExpiry] = useState("");

  // Authenticate Admin On mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState("not_admin");
        setLoading(false);
        return;
      }
      
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
      loadCoupons();
    }
    checkAuth();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCoupons(data);
    }
    setLoading(false);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !amount.trim()) {
      toast.error("Please fill in code and discount amount.");
      return;
    }

    setSubmitting(true);
    const cleanCode = code.trim().toUpperCase();

    try {
      await createPromoCodeAction({
        code: cleanCode,
        discountType,
        amount: parseFloat(amount),
        minOrderValue: parseFloat(minOrder || "0"),
        expiresAt: expiry ? new Date(expiry).toISOString() : null,
      });

      toast.success(`Coupon ${cleanCode} created successfully!`);
      setCode("");
      setAmount("");
      setMinOrder("0");
      setExpiry("");
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string, codeName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the promo code ${codeName}?`)) {
      return;
    }

    try {
      await deletePromoCodeAction(id);
      toast.success(`Promo code ${codeName} deleted.`);
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    }
  };

  const toggleCouponStatus = async (id: string, currentStatus: boolean, codeName: string) => {
    try {
      await togglePromoCodeStatusAction(id, !currentStatus);
      toast.success(`Coupon "${codeName}" ${!currentStatus ? "activated" : "deactivated"}.`);
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  if (authState === "checking") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-3" />
        <p className="text-sm font-mono">Authenticating manager credentials...</p>
      </div>
    );
  }

  if (authState === "not_admin") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
        <h1 className="text-md font-bold uppercase tracking-wider">Access Unverified</h1>
        <p className="text-xs text-zinc-400 mt-2">Only registered administrators can access Kitchio Promo coupon manager.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 px-8 flex items-center justify-between shrink-0 bg-zinc-950">
        <div className="flex items-center gap-3">
          <Ticket className="h-5 w-5 text-zinc-400" />
          <h1 className="text-lg font-bold tracking-tight">Promo Codes & Coupons</h1>
        </div>
        <div className="text-xs text-zinc-500 font-mono bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-xl">
          Active Campaigns: {coupons.filter(c => c.active).length}
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-950/40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Form Column */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Create Promo Campaign</h2>
              <p className="text-[11px] text-zinc-500 mt-1">Configure bulk percentage discounts or flat fixed value coupon codes.</p>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="E.g. SUMMER25"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium placeholder:text-zinc-650 focus:border-[#0F8A5F] focus:outline-none transition-all"
                />
              </div>

              {/* Type Grid */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Discount Type</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      discountType === "percentage"
                        ? "bg-[#0F8A5F]/10 border-[#0F8A5F] text-[#0F8A5F]"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed")}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      discountType === "fixed"
                        ? "bg-[#0F8A5F]/10 border-[#0F8A5F] text-[#0F8A5F]"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    Fixed Amount (£)
                  </button>
                </div>
              </div>

              {/* Amount & Min Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    {discountType === "percentage" ? "Percentage Off (%)" : "Value Off (£)"} *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={discountType === "percentage" ? "20" : "5.00"}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium placeholder:text-zinc-650 focus:border-[#0F8A5F] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Min Basket Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    placeholder="15.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium placeholder:text-zinc-650 focus:border-[#0F8A5F] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-[#0F8A5F] focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2.5 flex items-center justify-center gap-2 rounded-xl bg-[#0F8A5F] hover:bg-[#0D7A54] py-3 text-xs font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Launch Campaign</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List Column */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Active Coupons & Campaigns</h2>
              <p className="text-[11px] text-zinc-500 mt-1">Manage active campaigns, monitor coupon status or permanently revoke codes.</p>
            </div>

            {loading ? (
              <div className="py-20 text-center text-zinc-550 font-mono animate-pulse">
                Fetching Kitchio campaign logs...
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-2xl bg-zinc-900/10">
                <Ticket className="h-7 w-7 text-zinc-650 mx-auto mb-3 stroke-[1.5]" />
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">No promo codes launched yet</p>
                <p className="text-[10px] text-zinc-500 mt-1 font-semibold max-w-xs mx-auto">Create and deploy your first discount code using the campaign form.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.map((coupon) => {
                  const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                  return (
                    <div
                      key={coupon.id}
                      className={`rounded-2xl border bg-zinc-900/30 p-5 shadow-inner transition-all flex flex-col justify-between h-44 ${
                        coupon.active && !expired
                          ? "border-zinc-800 hover:border-zinc-700"
                          : "border-zinc-900 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold tracking-wider text-zinc-50 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                              {coupon.code}
                            </span>
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              coupon.active && !expired
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}>
                              {expired ? "Expired" : coupon.active ? "Active" : "Paused"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 mt-3.5 text-xs font-serif font-bold text-[#0F8A5F]">
                            <Coins className="h-4 w-4" />
                            <span>
                              {coupon.discount_type === "percentage"
                                ? `${Number(coupon.amount)}% off`
                                : `£${Number(coupon.amount).toFixed(2)} off`}
                            </span>
                          </div>
                        </div>

                        {/* Status Toggle & Delete Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCouponStatus(coupon.id, coupon.active, coupon.code)}
                            className="p-1 rounded bg-zinc-800/60 border border-zinc-700/20 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                            title={coupon.active ? "Pause Coupon" : "Activate Coupon"}
                          >
                            {coupon.active ? <ToggleRight className="h-4 w-4 text-[#0F8A5F]" /> : <ToggleLeft className="h-4 w-4 text-zinc-550" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                            className="p-1 rounded bg-zinc-800/60 border border-zinc-700/20 text-zinc-450 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Coupon metadata */}
                      <div className="border-t border-zinc-800/60 pt-3.5 flex items-center justify-between text-[9px] font-semibold text-zinc-500">
                        <div className="flex items-center gap-1">
                          <span>Min Order:</span>
                          <span className="text-zinc-300">£{Number(coupon.min_order_value || 0).toFixed(2)}</span>
                        </div>

                        {coupon.expires_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-zinc-500" />
                            <span>Expires:</span>
                            <span className="text-zinc-300">
                              {new Date(coupon.expires_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit"
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
