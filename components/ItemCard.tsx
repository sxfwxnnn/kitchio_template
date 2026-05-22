"use client";

import { useState, useCallback, memo } from "react";
import { MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { Plus, Minus } from "lucide-react";
import Image from "next/image";

interface ItemCardProps {
  item: MenuItem;
  isOpen: boolean;
  onOpenModal: (item: MenuItem) => void;
}

const ItemCard = memo(function ItemCard({
  item,
  isOpen,
  onOpenModal,
}: ItemCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const [showAllergens, setShowAllergens] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const cartLines = items.filter((ci) => ci.itemId === item.id);
  const totalInCart = cartLines.reduce((sum, ci) => sum + ci.quantity, 0);

  const hasCustomization =
    (item.optionGroups && item.optionGroups.length > 0) ||
    item.extras.length > 0;

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.available || !isOpen) return;
    if (hasCustomization) {
      onOpenModal(item);
    } else {
      addItem(item.id, item.name, item.price, 1, [], []);
    }
  }, [item, isOpen, hasCustomization, onOpenModal, addItem]);

  const handleSimpleIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasCustomization) {
      onOpenModal(item);
    } else {
      addItem(item.id, item.name, item.price, 1, [], []);
    }
  }, [item, hasCustomization, onOpenModal, addItem]);

  const handleSimpleDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartLines.length === 1) {
      const line = cartLines[0];
      updateQuantity(line.cartLineId, line.quantity - 1);
    }
  }, [cartLines, updateQuantity]);

  return (
    <div
      id={`item-${item.id}`}
      onClick={() => item.available && isOpen && onOpenModal(item)}
      className={`group relative flex rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-zinc-150/40 transition-all duration-300 cursor-pointer ${
        !item.available ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {/* Content Left */}
      <div className="flex flex-1 flex-col justify-between p-4 pr-2">
        <div>
          {item.isPopular && (
            <span className="mb-2 inline-flex items-center rounded-full bg-zinc-950 px-2 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider">
              Popular
            </span>
          )}

          <h3 className="text-sm font-bold text-zinc-900 leading-snug tracking-tight group-hover:text-zinc-950 transition-colors">
            {item.name}
          </h3>

          <p className="mt-1 text-xs text-zinc-400 font-medium line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {item.allergens.length > 0 && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllergens(!showAllergens);
                }}
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Allergens {showAllergens ? "−" : "+"}
              </button>
              {showAllergens && (
                <p className="mt-1 text-[10px] font-semibold text-zinc-400 bg-zinc-50 py-0.5 px-2 rounded inline-block">
                  {item.allergens.join(", ")}
                </p>
              )}
            </div>
          )}

          {item.calories > 0 && (
            <p className="mt-1 text-[10px] font-semibold text-zinc-400">
              {item.calories} kcal
            </p>
          )}
        </div>

        {/* Price + Add Button */}
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm font-bold text-zinc-950 font-serif">
            £{item.price.toFixed(2)}
          </span>

          {item.available && isOpen && (
            <div onClick={(e) => e.stopPropagation()}>
              {totalInCart === 0 ? (
                <button
                  onClick={handleAddClick}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-white transition-transform duration-100 hover:bg-zinc-800 active:scale-90 cursor-pointer shadow-sm"
                  aria-label={`Add ${item.name} to cart`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-150 rounded-full p-0.5 shadow-inner">
                  <button
                    onClick={handleSimpleDecrement}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-transparent hover:border-zinc-200 text-zinc-600 hover:bg-white transition-all active:scale-90 cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-zinc-900">
                    {totalInCart}
                  </span>
                  <button
                    onClick={handleSimpleIncrement}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition-colors active:scale-90 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Right */}
      <div className="relative h-auto w-[115px] shrink-0 overflow-hidden rounded-r-2xl md:w-[130px]">
        {!imgLoaded && <div className="absolute inset-0 bg-zinc-100 animate-pulse" />}
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="130px"
          className={`object-cover transition-all duration-500 group-hover:scale-105 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImgLoaded(true)}
        />
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[1px]">
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[9px] font-bold text-zinc-900 uppercase tracking-wider shadow-md">
              Sold out
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default ItemCard;
