"use client";

import { memo } from "react";
import { CartItem as CartItemType } from "@/types";
import { useCart } from "@/context/CartContext";
import { X, Plus, Minus } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
}

const CartItem = memo(function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();

  const optionsText = item.selectedOptions
    .map((o) => o.optionName)
    .join(", ");
  const extrasText = item.selectedExtras
    .map((e) => `+ ${e.name}`)
    .join(", ");

  return (
    <div className="flex items-start justify-between gap-3 border-b border-brand-border py-4 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-bold text-brand-text leading-tight uppercase tracking-wide">
            {item.name}
          </h4>
          <button
            onClick={() => removeItem(item.cartLineId)}
            className="shrink-0 text-brand-text-muted hover:text-red-500 transition-colors mt-0.5 cursor-pointer"
            aria-label={`Remove ${item.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {optionsText && (
          <p className="mt-1 text-[10px] font-semibold text-brand-text-muted">{optionsText}</p>
        )}
        {extrasText && (
          <p className="mt-0.5 text-[10px] font-semibold text-brand-accent">{extrasText}</p>
        )}
        
        {item.note && (
          <div className="mt-1.5 flex items-start gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-relaxed">
            <span className="shrink-0 mt-0.5">💬</span>
            <p className="italic">"{item.note}"</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center border border-brand-border rounded-xl overflow-hidden bg-brand-bg/50">
            <button
              onClick={() =>
                updateQuantity(item.cartLineId, item.quantity - 1)
              }
              className="flex h-7 w-7 items-center justify-center text-brand-text-muted hover:text-brand-text hover:bg-brand-text/5 transition-all cursor-pointer"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex h-7 w-7 items-center justify-center border-x border-brand-border bg-brand-card text-xs font-bold text-brand-text">
              {item.quantity}
            </span>
            <button
              onClick={() =>
                updateQuantity(item.cartLineId, item.quantity + 1)
              }
              className="flex h-7 w-7 items-center justify-center text-brand-text-muted hover:text-brand-text hover:bg-brand-text/5 transition-all cursor-pointer"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <span className="text-xs font-extrabold text-brand-text font-serif">
            £{item.totalPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
});

export default CartItem;
