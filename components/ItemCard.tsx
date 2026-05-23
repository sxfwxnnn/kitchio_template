"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { Plus, Minus, Heart } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    try {
      const wishlist = JSON.parse(localStorage.getItem("kitchio-wishlist") || "[]");
      setIsWishlisted(wishlist.includes(item.id));
    } catch {
      // Ignore
    }
  }, [item.id]);

  const toggleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const wishlist = JSON.parse(localStorage.getItem("kitchio-wishlist") || "[]");
      let updated = [...wishlist];
      if (isWishlisted) {
        updated = updated.filter((id: string) => id !== item.id);
        setIsWishlisted(false);
        toast.success(`Removed ${item.name} from wishlist.`);
      } else {
        updated.push(item.id);
        setIsWishlisted(true);
        toast.success(`Added ${item.name} to wishlist!`, {
          description: "Access your favorites anytime from your account settings.",
        });
      }
      localStorage.setItem("kitchio-wishlist", JSON.stringify(updated));

      // Self-healing database sync if logged in
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          if (isWishlisted) {
            supabase
              .from("user_wishlists")
              .delete()
              .eq("user_id", user.id)
              .eq("menu_item_id", item.id)
              .then();
          } else {
            supabase
              .from("user_wishlists")
              .upsert({ user_id: user.id, menu_item_id: item.id })
              .then();
          }
        }
      });
    } catch {
      // Ignore
    }
  }, [item.id, item.name, isWishlisted]);

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
      className={`group relative flex rounded-2xl bg-brand-card border border-brand-border p-3 sm:p-4 gap-3 sm:gap-4 transition-all duration-300 hover:border-brand-text/25 hover:shadow-md cursor-pointer ${
        !item.available ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      {/* Content Left */}
      <div className="flex flex-1 flex-col justify-between pr-1">
        <div>
          {item.isPopular && (
            <span className="mb-2.5 inline-flex items-center rounded bg-brand-primary px-2 py-0.5 text-[8px] font-extrabold text-brand-bg uppercase tracking-wide">
              Popular
            </span>
          )}

          <h3 className="text-sm font-bold text-brand-text leading-snug tracking-tight transition-colors">
            {item.name}
          </h3>

          <p className="mt-1 text-xs text-brand-text-muted font-medium line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {item.allergens.length > 0 && (
            <div className="mt-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllergens(!showAllergens);
                }}
                className="text-[9px] font-bold uppercase tracking-wider text-brand-text-muted hover:text-brand-text transition-colors"
              >
                Allergens {showAllergens ? "−" : "+"}
              </button>
              {showAllergens && (
                <p className="mt-1.5 text-[9px] font-semibold text-brand-text bg-brand-bg border border-brand-border py-0.5 px-2 rounded inline-block">
                  {item.allergens.join(", ")}
                </p>
              )}
            </div>
          )}

          {item.calories > 0 && (
            <p className="mt-1.5 text-[10px] font-semibold text-brand-text-muted/80">
              {item.calories} kcal
            </p>
          )}
        </div>

        {/* Price + Add Button */}
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm font-bold text-brand-text font-serif">
            £{item.price.toFixed(2)}
          </span>

          {item.available && isOpen && (
            <div onClick={(e) => e.stopPropagation()}>
              {totalInCart === 0 ? (
                <button
                  onClick={handleAddClick}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-brand-bg transition-all duration-100 hover:opacity-90 active:scale-90 cursor-pointer"
                  aria-label={`Add ${item.name} to cart`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-brand-card border border-brand-border rounded-full p-0.5 shadow-sm">
                  <button
                    onClick={handleSimpleDecrement}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-brand-text-muted hover:text-brand-text hover:bg-brand-bg transition-all active:scale-90 cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-brand-text">
                    {totalInCart}
                  </span>
                  <button
                    onClick={handleSimpleIncrement}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-brand-bg hover:opacity-90 transition-colors active:scale-90 cursor-pointer"
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
      <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-brand-bg self-center">
        {/* Heart Wishlist Trigger */}
        <button
          type="button"
          onClick={toggleWishlist}
          className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-zinc-450 hover:text-red-500 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer border border-zinc-100"
          aria-label="Add to wishlist"
        >
          <Heart className={`h-3 w-3 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-zinc-400"}`} />
        </button>

        {!imgLoaded && <div className="absolute inset-0 bg-brand-bg animate-pulse" />}
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 96px, 112px"
          className={`object-cover transition-all duration-500 group-hover:scale-105 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImgLoaded(true)}
        />
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
            <span className="rounded-md bg-brand-card border border-brand-border px-2.5 py-1 text-[9px] font-bold text-brand-text-muted uppercase tracking-wider shadow-md">
              Sold out
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default ItemCard;
