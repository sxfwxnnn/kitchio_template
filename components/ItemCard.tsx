"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { Plus, Minus, Heart } from "lucide-react";
import { useToastSystem } from "./ToastSystem";
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
  const { showToast } = useToastSystem();
  
  const [showAllergens, setShowAllergens] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

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
        showToast(`Removed ${item.name} from wishlist.`, "info");
      } else {
        updated.push(item.id);
        setIsWishlisted(true);
        showToast(`Added ${item.name} to wishlist!`, "success");
      }
      localStorage.setItem("kitchio-wishlist", JSON.stringify(updated));

      // Sync wishlists inside Supabase if user is logged in
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
  }, [item.id, item.name, isWishlisted, showToast]);

  const cartLines = items.filter((ci) => ci.itemId === item.id);
  const totalInCart = cartLines.reduce((sum, ci) => sum + ci.quantity, 0);

  const hasCustomization =
    (item.optionGroups && item.optionGroups.length > 0) ||
    (item.extras && item.extras.length > 0);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.available || !isOpen) return;
    if (hasCustomization) {
      onOpenModal(item);
    } else {
      addItem(item.id, item.name, item.price, 1, [], []);
      showToast(`${item.name} added to cart`, "success");
    }
  }, [item, isOpen, hasCustomization, onOpenModal, addItem, showToast]);

  const handleSimpleIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasCustomization) {
      onOpenModal(item);
    } else {
      addItem(item.id, item.name, item.price, 1, [], []);
      showToast(`${item.name} added to cart`, "success");
    }
  }, [item, hasCustomization, onOpenModal, addItem, showToast]);

  const handleSimpleDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartLines.length > 0) {
      // Find the last added cart item for simple decrements
      const lastLine = cartLines[cartLines.length - 1];
      updateQuantity(lastLine.cartLineId, lastLine.quantity - 1);
      showToast(`Removed 1 ${item.name} from cart`, "info");
    }
  }, [cartLines, updateQuantity, item.name, showToast]);

  // Determine category food emoji based on item details or category name
  const getFoodEmoji = () => {
    const name = item.name.toLowerCase();
    const desc = item.description.toLowerCase();
    
    if (name.includes("pizza") || desc.includes("tomato") || name.includes("margherita") || name.includes("diavola")) return "🍕";
    if (name.includes("bread") || name.includes("bruschetta")) return "🍞";
    if (name.includes("salad") || name.includes("caprese")) return "🥗";
    if (name.includes("chips") || name.includes("fries") || name.includes("onion")) return "🍟";
    if (name.includes("cake") || name.includes("tiramisu") || name.includes("cheesecake")) return "🍰";
    if (name.includes("beer") || name.includes("ale") || name.includes("coke") || name.includes("lemonade") || name.includes("water") || name.includes("pellegrino")) return "🥤";
    if (name.includes("calamari") || name.includes("squid")) return "🦑";
    return "🍗";
  };

  return (
    <div
      id={`item-${item.id}`}
      onClick={() => item.available && isOpen && onOpenModal(item)}
      className={`group relative flex rounded-[12px] bg-white border border-[#E8E8E8] p-4 gap-4 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[2px] cursor-pointer text-[#1A1A1A] ${
        !item.available ? "opacity-60 cursor-not-allowed select-none" : ""
      }`}
    >
      {/* Content Left */}
      <div className="flex flex-1 flex-col justify-between pr-1 min-w-0">
        <div>
          {item.isPopular && (
            <span className="mb-2 inline-flex items-center rounded-full bg-[#FF5C1A] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider select-none">
              POPULAR
            </span>
          )}

          <h3 className="text-base font-bold leading-snug tracking-tight text-[#1A1A1A]">
            {item.name}
          </h3>

          <p className="mt-1 text-sm text-[#717171] leading-relaxed line-clamp-2 select-none">
            {item.description}
          </p>

          {item.allergens.length > 0 && (
            <div className="mt-2 flex flex-col items-start">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllergens(!showAllergens);
                }}
                className="text-[11px] font-bold tracking-wider text-[#717171] hover:text-[#1A1A1A] transition-colors cursor-pointer"
              >
                ALLERGENS +
              </button>
              {showAllergens && (
                <p className="mt-1 text-[10px] font-semibold text-[#717171] bg-[#FAFAFA] border border-[#E8E8E8] py-0.5 px-2 rounded inline-block animate-fade-in">
                  {item.allergens.join(", ")}
                </p>
              )}
            </div>
          )}

          {item.calories > 0 && (
            <p className="mt-1.5 text-xs text-[#717171]/70 font-semibold select-none">
              {item.calories} kcal
            </p>
          )}
        </div>

        {/* Price Row (Add button handles itself below) */}
        <div className="mt-3">
          <span className="text-lg font-bold text-[#1A1A1A] tracking-tight">
            £{item.price.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Image Right & Unavailable Overlay */}
      <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-[#FAFAFA] self-center">
        {/* Heart Wishlist Trigger */}
        {item.available && (
          <button
            type="button"
            onClick={toggleWishlist}
            className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-zinc-400 hover:text-red-500 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer border border-[#E8E8E8]"
            aria-label="Add to wishlist"
          >
            <Heart className={`h-3 w-3 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-zinc-400"}`} />
          </button>
        )}

        {imageError ? (
          /* Warm Gradient Fallback with Category Emoji */
          <div
            className="absolute inset-0 flex items-center justify-center select-none"
            style={{
              background: "linear-gradient(135deg, #FF5C1A 0%, #FF8C42 100%)",
            }}
          >
            <span className="text-4xl">{getFoodEmoji()}</span>
          </div>
        ) : (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}

        {/* Unavailable overlay */}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 select-none">
            <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/45 px-2.5 py-1 rounded">
              Unavailable
            </span>
          </div>
        )}

        {/* Floating Add to Cart Button bottom right of image */}
        {item.available && isOpen && (
          <div 
            className="absolute bottom-1.5 right-1.5 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {totalInCart === 0 ? (
              <button
                onClick={handleAddClick}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5C1A] text-white hover:bg-[#FF5C1A]/90 transition-all active:scale-90 cursor-pointer shadow-md"
                aria-label={`Add ${item.name} to cart`}
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-white border border-[#E8E8E8] rounded-full p-0.5 shadow-md animate-fade-in">
                <button
                  onClick={handleSimpleDecrement}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#717171] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] transition-all active:scale-90 cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-xs font-extrabold text-[#1A1A1A]">
                  {totalInCart}
                </span>
                <button
                  onClick={handleSimpleIncrement}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5C1A] text-white hover:bg-[#FF5C1A]/90 transition-all active:scale-90 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default ItemCard;
