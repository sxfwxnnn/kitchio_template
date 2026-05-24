"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Restaurant, MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import CartItemComponent from "@/components/CartItem";
import PromoInput from "./PromoInput";
import UpsellSection from "./UpsellSection";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import { useToastSystem } from "./ToastSystem";
import { checkOpeningStatus } from "@/lib/openingHours";

interface CartProps {
  restaurant: Restaurant;
  onOpenModal?: (item: MenuItem) => void;
}

export default function Cart({ restaurant, onOpenModal }: CartProps) {
  const router = useRouter();
  const { showToast } = useToastSystem();
  
  const {
    items,
    orderMode,
    subtotal,
    totalItems,
    specialInstructions,
    setSpecialInstructions,
    clearCart,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  
  // Settings sync for Closed check
  const [temporarilyClosed, setTemporarilyClosed] = useState(false);

  const handleDiscountChange = (discount: number, code: string | null) => {
    setPromoDiscount(discount);
    setAppliedPromoCode(code);
  };

  const deliveryFee =
    orderMode === "delivery"
      ? subtotal >= restaurant.freeDeliveryOver
        ? 0
        : restaurant.deliveryFee
      : 0;

  const total = Math.max(0, subtotal + deliveryFee - promoDiscount);
  const minimumMet = subtotal >= restaurant.minimumOrder;
  const amountToMinimum = restaurant.minimumOrder - subtotal;

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push("/checkout");
  };

  // Check opening status
  const openingStatus = checkOpeningStatus(restaurant, temporarilyClosed);
  const isOrderingDisabled = !openingStatus.isOpen;

  // Render modal trigger callback or custom event
  const triggerOpenModal = (item: MenuItem) => {
    if (onOpenModal) {
      onOpenModal(item);
    } else {
      window.dispatchEvent(new CustomEvent("open-item-modal", { detail: item }));
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[900] bg-black/40 transition-opacity duration-200 ease-out ${
          isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      <div
        className={`fixed z-[950] bg-white transition-transform duration-300 ease-out transform-gpu flex flex-col
          inset-x-0 bottom-0 h-[95vh] rounded-t-2xl shadow-2xl border-t border-[#E8E8E8]
          lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[380px] lg:h-full lg:rounded-none lg:border-t-0 lg:border-l lg:border-[#E8E8E8] lg:shadow-[-8px_0_30px_rgba(0,0,0,0.06)]
          ${
            isCartOpen
              ? "translate-y-0 lg:translate-x-0"
              : "translate-y-full lg:translate-x-full"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E8E8] px-5 py-4 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#1A1A1A]">Your Cart</h2>
            {totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1A1A] text-[10px] font-extrabold text-white">
                {totalItems}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {totalItems > 0 && (
              <button
                onClick={() => {
                  clearCart();
                  showToast("Cleared all cart items", "info");
                }}
                className="text-[10px] text-[#717171]/80 hover:text-rose-500 font-bold uppercase tracking-wider transition-colors cursor-pointer border-none bg-transparent"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#FAFAFA] border border-transparent text-[#717171] hover:text-[#1A1A1A] transition-all cursor-pointer bg-transparent"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-2 scrollbar-none bg-[#FAFAFA]/30">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4 animate-fade-in">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E8E8E8] shadow-sm">
                <ShoppingBag className="h-6 w-6 text-[#717171]/70 stroke-[1.5]" />
              </div>
              <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                Your cart is empty
              </h3>
              <p className="mt-2 text-xs text-[#717171] leading-relaxed max-w-[220px] font-semibold">
                Curate your gourmet ordering selectables. Browse our delicious foods!
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              {/* Items List */}
              <div className="divide-y divide-[#E8E8E8]">
                {items.map((item) => (
                  <CartItemComponent key={item.cartLineId} item={item} />
                ))}
              </div>

              {/* Customers Also Love Up-sell Section */}
              <UpsellSection onOpenModal={triggerOpenModal} />

              {/* Special instructions textarea */}
              <div className="mt-4 pt-4 border-t border-[#E8E8E8]">
                <label className="block text-[10px] font-bold text-[#717171] uppercase tracking-wider mb-2 select-none">
                  Special requests / notes
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any requests? (e.g. no onions, extra sauce)"
                  className="w-full rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-xs text-[#1A1A1A] placeholder-[#717171]/50 resize-none h-16 focus:border-[#FF5C1A] focus:outline-none transition-all duration-150 font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer (sticky at bottom) */}
        {items.length > 0 && (
          <div className="border-t border-[#E8E8E8] px-5 py-4 shrink-0 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            
            {/* Promo Input inside Footer Container */}
            <PromoInput
              subtotal={subtotal}
              onDiscountChange={handleDiscountChange}
            />

            <div className="space-y-2 mb-4 pt-3.5 select-none">
              {/* Subtotal row */}
              <div className="flex justify-between text-xs text-[#717171] font-semibold">
                <span>Subtotal</span>
                <span className="font-extrabold text-[#1A1A1A]">£{subtotal.toFixed(2)}</span>
              </div>
              
              {/* Delivery fee row */}
              {orderMode === "delivery" && (
                <div className="flex justify-between text-xs text-[#717171] font-semibold">
                  <span>Delivery fee</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">FREE</span>
                    ) : (
                      <span className="font-extrabold text-[#1A1A1A]">£{deliveryFee.toFixed(2)}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Loyalty/Promo discount row */}
              {appliedPromoCode && (
                <div className="flex justify-between text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 py-1 px-2 rounded-lg">
                  <span>Promo Discount ({appliedPromoCode})</span>
                  <span className="font-extrabold">− £{promoDiscount.toFixed(2)}</span>
                </div>
              )}

              {/* Total row with bold larger font */}
              <div className="flex justify-between border-t border-dashed border-[#E8E8E8] pt-3 text-base font-extrabold text-[#1A1A1A]">
                <span>Total</span>
                <span className="text-lg text-[#FF5C1A]">£{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Minimum order warning */}
            {!minimumMet && orderMode === "delivery" && (
              <div className="mb-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-center select-none animate-pulse">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                  Add £{amountToMinimum.toFixed(2)} more for delivery
                </p>
              </div>
            )}

            {/* Go to checkout button */}
            <button
              onClick={handleCheckout}
              disabled={isOrderingDisabled || (!minimumMet && orderMode === "delivery")}
              className={`w-full rounded-xl py-3.5 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md border-none ${
                isOrderingDisabled
                  ? "bg-rose-100 text-rose-500 cursor-not-allowed select-none shadow-none"
                  : minimumMet || orderMode === "collection"
                  ? "bg-[#FF5C1A] text-white hover:bg-[#FF5C1A]/90 active:scale-[0.98]"
                  : "bg-[#FAFAFA] border border-[#E8E8E8] text-[#717171]/50 cursor-not-allowed select-none shadow-none"
              }`}
            >
              {isOrderingDisabled ? (
                "Ordering Closed"
              ) : (
                <>
                  Go to checkout
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="mt-3.5 text-center text-[9px] font-bold uppercase tracking-widest text-[#717171]/60 select-none">
              Powered by Kitchio
            </p>
          </div>
        )}
      </div>
    </>
  );
}
