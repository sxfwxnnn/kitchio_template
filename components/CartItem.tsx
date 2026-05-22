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
    <div className="flex items-start justify-between gap-3 border-b border-gray-50 py-3 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 leading-tight">
            {item.name}
          </h4>
          <button
            onClick={() => removeItem(item.cartLineId)}
            className="shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
            aria-label={`Remove ${item.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {optionsText && (
          <p className="mt-0.5 text-xs text-gray-500">{optionsText}</p>
        )}
        {extrasText && (
          <p className="mt-0.5 text-xs text-gray-500">{extrasText}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                updateQuantity(item.cartLineId, item.quantity - 1)
              }
              className="flex h-6 w-6 items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex h-6 w-6 items-center justify-center border-x border-gray-200 bg-gray-50 text-xs font-bold text-gray-900">
              {item.quantity}
            </span>
            <button
              onClick={() =>
                updateQuantity(item.cartLineId, item.quantity + 1)
              }
              className="flex h-6 w-6 items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <span className="text-sm font-semibold text-gray-900">
            £{item.totalPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
});

export default CartItem;
