"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Restaurant } from "@/types";
import { useCart } from "@/context/CartContext";
import CartItemComponent from "@/components/CartItem";
import PromoInput from "./PromoInput";
import { X, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CartProps {
  restaurant: Restaurant;
}

const UPSELL_ITEMS = [
  { id: "item-6", name: "Chunky Chips", price: 3.50, description: "Thick cut fries with sea salt" },
  { id: "item-7", name: "Onion Rings", price: 3.99, description: "Crispy battered onion rings" },
  { id: "item-9", name: "San Pellegrino", price: 2.50, description: "Sparkling water 500ml" },
  { id: "item-10", name: "Coca-Cola", price: 2.00, description: "330ml can" }
];

export default function Cart({ restaurant }: CartProps) {
  const router = useRouter();
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
    addItem
  } = useCart();

  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);

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

  const upsellCandidates = UPSELL_ITEMS.filter(
    (upsell) => !items.some((item) => item.itemId === upsell.id)
  );

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
        className={`fixed z-[950] bg-brand-card transition-transform duration-200 ease-out transform-gpu flex flex-col
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl shadow-2xl border-t border-brand-border
          lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[380px] lg:max-h-full lg:rounded-none lg:border-t-0 lg:border-l lg:border-brand-border lg:shadow-[-8px_0_30px_rgba(0,0,0,0.06)]
          ${
            isCartOpen
              ? "translate-y-0 lg:translate-x-0"
              : "translate-y-full lg:translate-x-full"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4 shrink-0 bg-brand-card">
          <div>
            <h2 className="text-xs font-bold text-brand-text uppercase tracking-wider">Your Basket</h2>
            {totalItems > 0 && (
              <button
                onClick={clearCart}
                className="text-[10px] text-brand-text-muted hover:text-red-500 font-bold uppercase tracking-wider transition-colors mt-0.5 cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-bg border border-transparent hover:border-brand-border text-brand-text-muted hover:text-brand-text transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-2 scrollbar-none bg-brand-bg/25">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 animate-fade-in">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-bg border border-brand-border shadow-lg">
                <ShoppingBag className="h-6 w-6 text-brand-text-muted stroke-[1.5]" />
              </div>
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                Your basket is empty
              </h3>
              <p className="mt-2 text-xs text-brand-text-muted leading-relaxed max-w-[220px] font-semibold">
                Your culinary journey starts here. Browse the menu to curate your perfect selection.
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              
              {/* Premium Progress Bar (Minimum order / Free Delivery tracking) */}
              {orderMode === "delivery" && (
                <div className="rounded-2xl border border-brand-border bg-brand-card p-4 space-y-2.5 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wide">
                      {subtotal >= restaurant.freeDeliveryOver ? (
                        <span className="text-emerald-600 font-bold">🎉 Free delivery unlocked!</span>
                      ) : (
                        <>
                          Add <span className="font-bold text-brand-text">£{(restaurant.freeDeliveryOver - subtotal).toFixed(2)}</span> more for free delivery
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-brand-text-muted font-bold">
                      £{subtotal.toFixed(2)} / £{restaurant.freeDeliveryOver.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="h-2 w-full rounded-full bg-brand-bg border border-brand-border overflow-hidden relative shadow-inner">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, (subtotal / restaurant.freeDeliveryOver) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-brand-border">
                {items.map((item) => (
                  <CartItemComponent key={item.cartLineId} item={item} />
                ))}
              </div>

              {/* Special instructions */}
              <div className="mt-4 pt-4 border-t border-brand-border">
                <label className="block text-[9px] font-bold text-brand-text-muted uppercase tracking-wider mb-2">
                  Special instructions
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="E.g. no onions, sauce on the side..."
                  className="w-full rounded-xl border border-brand-border bg-brand-card px-3 py-2.5 text-xs text-brand-text placeholder:text-brand-text-muted resize-none h-16 focus:border-brand-primary focus:outline-none transition-all duration-150 font-medium"
                />
              </div>

              {/* Up-sell Carousel */}
              {upsellCandidates.length > 0 && (
                <div className="mt-5 pt-5 border-t border-brand-border pb-2">
                  <h4 className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider mb-3">
                    Pairs well with...
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-none snap-x snap-mandatory">
                    {upsellCandidates.map((upsell) => (
                      <div
                        key={upsell.id}
                        className="flex flex-col shrink-0 w-[145px] rounded-xl border border-brand-border bg-brand-card p-3 snap-start shadow-sm hover:border-brand-text/25 transition-all duration-200"
                      >
                        <p className="text-[11px] font-extrabold text-brand-text truncate uppercase tracking-wide">
                          {upsell.name}
                        </p>
                        <p className="text-[9px] text-brand-text-muted mt-0.5 line-clamp-1 font-medium">
                          {upsell.description}
                        </p>
                        <div className="flex items-center justify-between mt-3.5">
                          <span className="text-xs font-bold text-brand-text font-serif">
                            £{upsell.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => {
                              addItem(upsell.id, upsell.name, upsell.price, 1, [], []);
                              toast.success(`${upsell.name} added to basket!`);
                            }}
                            className="rounded-full bg-brand-primary px-3 py-1 text-[9px] font-bold text-white hover:bg-brand-primary/95 transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with pricing */}
        {items.length > 0 && (
          <div className="border-t border-brand-border px-5 py-4 shrink-0 bg-brand-card">
            
            {/* Promo Input inside Footer Container */}
            <PromoInput
              subtotal={subtotal}
              onDiscountChange={handleDiscountChange}
            />

            <div className="space-y-1.5 mb-4 pt-3">
              <div className="flex justify-between text-xs text-brand-text-muted font-semibold">
                <span>Subtotal</span>
                <span className="font-serif text-brand-text">£{subtotal.toFixed(2)}</span>
              </div>
              {orderMode === "delivery" && (
                <div className="flex justify-between text-xs text-brand-text-muted font-semibold">
                  <span>Delivery</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-brand-accent font-bold uppercase tracking-wider text-[9px]">FREE</span>
                    ) : (
                      <span className="font-serif text-brand-text">£{deliveryFee.toFixed(2)}</span>
                    )}
                  </span>
                </div>
              )}
              {appliedPromoCode && (
                <div className="flex justify-between text-xs font-bold text-brand-accent bg-emerald-500/10 border border-emerald-500/20 py-0.5 px-1.5 rounded">
                  <span>Discount ({appliedPromoCode})</span>
                  <span className="font-serif">-£{promoDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-brand-border pt-2.5 text-sm font-bold text-brand-text">
                <span>Total</span>
                <span className="font-serif text-brand-text">£{total.toFixed(2)}</span>
              </div>
            </div>

            {!minimumMet && orderMode === "delivery" && (
              <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-center animate-pulse">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Add £{amountToMinimum.toFixed(2)} more to unlock delivery
                </p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={!minimumMet && orderMode === "delivery"}
              className={`w-full rounded-xl py-3 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg ${
                minimumMet || orderMode === "collection"
                  ? "bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-[0.98]"
                  : "bg-brand-bg border border-brand-border text-brand-text-muted cursor-not-allowed"
              }`}
            >
              Proceed to Checkout
            </button>

            <p className="mt-3.5 text-center text-[9px] font-bold uppercase tracking-widest text-brand-text-muted">
              Powered by Kitchio
            </p>
          </div>
        )}
      </div>
    </>
  );
}
