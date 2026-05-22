"use client";

import { useState, useEffect } from "react";
import { Tag, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface PromoInputProps {
  subtotal: number;
  onDiscountChange?: (discount: number, code: string | null) => void;
}

export default function PromoInput({ subtotal, onDiscountChange }: PromoInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load applied promo from localStorage on mount
  useEffect(() => {
    const savedPromo = localStorage.getItem("kitchio-applied-promo");
    if (savedPromo) {
      validateAndApplyPromo(savedPromo, false);
    }
  }, []);

  // Recalculate discount whenever subtotal changes and a promo is applied
  useEffect(() => {
    if (appliedPromo) {
      recalculateDiscount(appliedPromo);
    } else {
      if (onDiscountChange) onDiscountChange(0, null);
    }
  }, [subtotal, appliedPromo]);

  const recalculateDiscount = async (code: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (error || !data) {
        removePromo();
        return;
      }

      if (subtotal < Number(data.min_order_value)) {
        // If subtotal drops below minimum order value, remove promo and notify
        removePromo();
        toast.info(`Promo code '${code}' removed. Minimum order value of £${Number(data.min_order_value).toFixed(2)} not met.`);
        return;
      }

      let calculatedDiscount = 0;
      if (data.discount_type === "percentage") {
        calculatedDiscount = subtotal * (Number(data.amount) / 100);
      } else {
        calculatedDiscount = Number(data.amount);
      }

      setPromoDiscount(calculatedDiscount);
      if (onDiscountChange) onDiscountChange(calculatedDiscount, code);
    } catch (err) {
      console.error("Error recalculating promo discount", err);
    }
  };

  const validateAndApplyPromo = async (code: string, showToast = true) => {
    setPromoError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (error || !data) {
        setPromoError("Invalid promo code");
        if (showToast) toast.error("Invalid promo code");
        setAppliedPromo(null);
        setPromoDiscount(0);
        if (onDiscountChange) onDiscountChange(0, null);
        setLoading(false);
        return;
      }

      // Check min order value
      if (subtotal < Number(data.min_order_value)) {
        const errMsg = `Minimum order of £${Number(data.min_order_value).toFixed(2)} required`;
        setPromoError(errMsg);
        if (showToast) toast.error(errMsg);
        setAppliedPromo(null);
        setPromoDiscount(0);
        if (onDiscountChange) onDiscountChange(0, null);
        setLoading(false);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError("Promo code has expired");
        if (showToast) toast.error("Promo code has expired");
        setAppliedPromo(null);
        setPromoDiscount(0);
        if (onDiscountChange) onDiscountChange(0, null);
        setLoading(false);
        return;
      }

      setAppliedPromo(data.code);
      localStorage.setItem("kitchio-applied-promo", data.code);

      let calculatedDiscount = 0;
      if (data.discount_type === "percentage") {
        calculatedDiscount = subtotal * (Number(data.amount) / 100);
      } else {
        calculatedDiscount = Number(data.amount);
      }

      setPromoDiscount(calculatedDiscount);
      if (onDiscountChange) onDiscountChange(calculatedDiscount, data.code);
      if (showToast) toast.success(`Promo code applied: -£${calculatedDiscount.toFixed(2)}!`);
      setPromoInput("");
    } catch (err) {
      setPromoError("Failed to apply promo code");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    validateAndApplyPromo(code, true);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    localStorage.removeItem("kitchio-applied-promo");
    if (onDiscountChange) onDiscountChange(0, null);
    setPromoError("");
  };

  return (
    <div className="border-t border-zinc-100 py-3 mt-2">
      {!appliedPromo ? (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between py-1 text-xs font-bold text-zinc-500 hover:text-zinc-950 transition-colors uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Do you have a promo code?
            </span>
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {isOpen && (
            <div className="mt-2.5 flex gap-2 animate-in slide-in-from-top-1 duration-150">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="E.g. 20SPECIAL"
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs font-medium placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none transition-all duration-150"
              />
              <button
                onClick={handleApplyClick}
                disabled={loading || !promoInput.trim()}
                className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {loading ? "Checking..." : "Apply"}
              </button>
            </div>
          )}
          {promoError && (
            <p className="mt-1.5 text-[10px] font-semibold text-red-500 bg-red-50/50 py-1 px-2.5 rounded border border-red-100">
              {promoError}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-150 p-3 animate-in zoom-in-98 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-zinc-900 fill-zinc-100" />
            <div>
              <p className="text-[11px] font-bold text-zinc-900">
                Promo Applied: {appliedPromo}
              </p>
              <p className="text-[10px] font-bold text-zinc-500 mt-0.5">
                Saved £{promoDiscount.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={removePromo}
            className="rounded-full p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            title="Remove Promo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
