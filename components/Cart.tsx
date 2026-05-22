"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Restaurant } from "@/types";
import { useCart } from "@/context/CartContext";
import CartItemComponent from "@/components/CartItem";
import PromoInput from "./PromoInput";
import { X, ShoppingBag } from "lucide-react";
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
        className={`fixed inset-0 z-[900] bg-zinc-950/50 transition-opacity duration-150 ${
          isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      <div
        className={`fixed z-[950] bg-white transition-transform duration-150 ease-out will-change-transform flex flex-col
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl shadow-2xl border-t border-zinc-100
          lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[380px] lg:max-h-full lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-[-8px_0_30px_rgba(0,0,0,0.04)]
          ${
            isCartOpen
              ? "translate-y-0 lg:translate-x-0"
              : "translate-y-full lg:translate-x-full"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 shrink-0 bg-white">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Your Basket</h2>
            {totalItems > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-zinc-400 hover:text-red-500 font-semibold transition-colors mt-0.5"
              >
                Clear all
              </button>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-50 border border-transparent hover:border-zinc-200 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-2 scrollbar-thin">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 animate-in fade-in duration-300">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 border border-zinc-150 shadow-sm">
                <ShoppingBag className="h-6 w-6 text-zinc-400 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                Your basket is empty
              </h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed max-w-[220px] font-medium">
                Your culinary journey starts here. Browse the menu to curate your perfect selection.
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              <div className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <CartItemComponent key={item.cartLineId} item={item} />
                ))}
              </div>

              {/* Special instructions */}
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Special instructions
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="E.g. no onions, sauce on the side..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 resize-none h-16 focus:border-zinc-950 focus:bg-white focus:outline-none transition-all duration-150 font-medium"
                />
              </div>

              {/* Up-sell Carousel */}
              {upsellCandidates.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-100 pb-2">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">
                    Pairs well with...
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-none snap-x snap-mandatory">
                    {upsellCandidates.map((upsell) => (
                      <div
                        key={upsell.id}
                        className="flex flex-col shrink-0 w-[145px] rounded-xl border border-zinc-150 bg-white p-3 snap-start shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-zinc-300 hover:shadow-md transition-all duration-200"
                      >
                        <p className="text-[11px] font-bold text-zinc-900 truncate">
                          {upsell.name}
                        </p>
                        <p className="text-[9px] text-zinc-400 mt-0.5 line-clamp-1">
                          {upsell.description}
                        </p>
                        <div className="flex items-center justify-between mt-3.5">
                          <span className="text-xs font-bold text-zinc-950 font-serif">
                            £{upsell.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => {
                              addItem(upsell.id, upsell.name, upsell.price, 1, [], []);
                              toast.success(`${upsell.name} added to basket!`);
                            }}
                            className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 transition-colors active:scale-95 cursor-pointer"
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
          <div className="border-t border-zinc-100 px-5 py-4 shrink-0 bg-white">
            
            {/* Promo Input inside Footer Container */}
            <PromoInput
              subtotal={subtotal}
              onDiscountChange={handleDiscountChange}
            />

            <div className="space-y-1.5 mb-4 pt-3">
              <div className="flex justify-between text-xs text-zinc-500 font-medium">
                <span>Subtotal</span>
                <span className="font-serif text-zinc-900">£{subtotal.toFixed(2)}</span>
              </div>
              {orderMode === "delivery" && (
                <div className="flex justify-between text-xs text-zinc-500 font-medium">
                  <span>Delivery</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-zinc-900 font-bold uppercase tracking-wider text-[10px]">FREE</span>
                    ) : (
                      <span className="font-serif text-zinc-900">£{deliveryFee.toFixed(2)}</span>
                    )}
                  </span>
                </div>
              )}
              {appliedPromoCode && (
                <div className="flex justify-between text-xs font-bold text-green-700 bg-green-50/50 py-0.5 px-1 rounded">
                  <span>Discount ({appliedPromoCode})</span>
                  <span className="font-serif">-£{promoDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-zinc-150 pt-2.5 text-sm font-bold text-zinc-950">
                <span>Total</span>
                <span className="font-serif text-zinc-950">£{total.toFixed(2)}</span>
              </div>
            </div>

            {!minimumMet && orderMode === "delivery" && (
              <div className="mb-3 rounded-xl bg-amber-50/70 border border-amber-100 px-3 py-2.5 text-center animate-pulse">
                <p className="text-[11px] font-bold text-amber-700">
                  Add £{amountToMinimum.toFixed(2)} more to unlock delivery
                </p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={!minimumMet && orderMode === "delivery"}
              className={`w-full rounded-full py-3.5 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md ${
                minimumMet || orderMode === "collection"
                  ? "bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]"
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
              }`}
            >
              Proceed to Checkout
            </button>

            <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              Powered by Kitchio
            </p>
          </div>
        )}
      </div>
    </>
  );
}
