"use client";

import { memo } from "react";
import { CartItem as CartItemType } from "@/types";
import { useCart } from "@/context/CartContext";
import { X, Plus, Minus } from "lucide-react";
import { useToastSystem } from "./ToastSystem";

interface CartItemProps {
  item: CartItemType;
}

const CartItem = memo(function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { showToast } = useToastSystem();

  const handleRemove = () => {
    removeItem(item.cartLineId);
    showToast(`Removed ${item.name} from cart`, "info");
  };

  return (
    <div className="flex flex-col gap-2 border-b border-[#E8E8E8] py-4 last:border-b-0 text-[#1A1A1A]">
      {/* Top row: Name & Remove */}
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug uppercase tracking-wide">
          {item.name}
        </h4>
        <button
          onClick={handleRemove}
          className="shrink-0 text-[#717171]/60 hover:text-rose-500 transition-colors p-0.5 rounded-full hover:bg-[#FAFAFA] cursor-pointer border-none bg-transparent"
          aria-label={`Remove ${item.name}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Options & Extras on separate lines with "+" prefix */}
      <div className="space-y-0.5 select-none">
        {item.selectedOptions?.map((o, idx) => (
          <p key={idx} className="text-[10px] font-semibold text-[#717171] leading-none">
            + {o.optionName}
          </p>
        ))}
        {item.selectedExtras?.map((e, idx) => (
          <p key={idx} className="text-[10px] font-semibold text-[#717171] leading-none">
            + {e.name}
          </p>
        ))}
        {item.note && (
          <div className="mt-1 flex items-start gap-1 rounded-lg bg-amber-50 border border-amber-100 px-2 py-1 text-[10px] text-amber-800 font-semibold italic">
            💬 "{item.note}"
          </div>
        )}
      </div>

      {/* Bottom row: Price left | Quantity right */}
      <div className="flex items-center justify-between mt-1.5 select-none">
        <span className="text-xs font-extrabold text-[#FF5C1A]">
          £{item.totalPrice.toFixed(2)}
        </span>

        {/* Quantity Controls matching screenshot details */}
        <div className="flex items-center border border-[#E8E8E8] rounded-xl overflow-hidden bg-[#FAFAFA]">
          <button
            onClick={() => {
              updateQuantity(item.cartLineId, item.quantity - 1);
              showToast(`Removed 1 ${item.name}`, "info");
            }}
            className="flex h-7 w-7 items-center justify-center text-[#717171] hover:text-[#1A1A1A] hover:bg-[#E8E8E8]/50 transition-colors cursor-pointer border-none bg-transparent"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="flex h-7 w-6 items-center justify-center bg-white border-x border-[#E8E8E8] text-xs font-extrabold text-[#1A1A1A]">
            {item.quantity}
          </span>
          <button
            onClick={() => {
              updateQuantity(item.cartLineId, item.quantity + 1);
              showToast(`Added 1 ${item.name}`, "success");
            }}
            className="flex h-7 w-7 items-center justify-center text-[#717171] hover:text-[#1A1A1A] hover:bg-[#E8E8E8]/50 transition-colors cursor-pointer border-none bg-transparent"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default CartItem;
