"use client";

import { useMemo, useState } from "react";
import { MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { demoMenuCategories } from "@/data/restaurant";
import { Plus } from "lucide-react";
import { useToastSystem } from "./ToastSystem";

interface UpsellSectionProps {
  onOpenModal: (item: MenuItem) => void;
}

export default function UpsellSection({ onOpenModal }: UpsellSectionProps) {
  const { items: cartItems, addItem } = useCart();
  const { showToast } = useToastSystem();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const upsellItems = useMemo(() => {
    const cartItemIds = cartItems.map((ci) => ci.itemId);
    
    // Flat list of all items with their category id
    const allItems: { item: MenuItem; categoryId: string }[] = [];
    demoMenuCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        allItems.push({ item, categoryId: cat.id });
      });
    });

    const cartCategoryIds = new Set(
      allItems.filter((ai) => cartItemIds.includes(ai.item.id)).map((ai) => ai.categoryId)
    );

    // Candidates are items not currently in the cart
    const candidates = allItems.filter((ai) => !cartItemIds.includes(ai.item.id));

    // Sort:
    // 1. Items from categories not ordered from yet
    // 2. upsellPriority (lower = better, e.g. 1 shows first)
    // 3. isPopular = true shown first
    candidates.sort((a, b) => {
      const aOrderedCat = cartCategoryIds.has(a.categoryId) ? 1 : 0;
      const bOrderedCat = cartCategoryIds.has(b.categoryId) ? 1 : 0;
      if (aOrderedCat !== bOrderedCat) {
        return aOrderedCat - bOrderedCat;
      }

      const aPriority = a.item.upsellPriority ?? 99;
      const bPriority = b.item.upsellPriority ?? 99;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aPop = a.item.isPopular ? 1 : 0;
      const bPop = b.item.isPopular ? 1 : 0;
      return bPop - aPop;
    });

    return candidates.slice(0, 6).map((c) => c.item);
  }, [cartItems]);

  const handleAddClick = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    const hasCustomization =
      (item.optionGroups && item.optionGroups.length > 0) ||
      (item.extras && item.extras.length > 0);

    if (hasCustomization) {
      onOpenModal(item);
    } else {
      addItem(item.id, item.name, item.price, 1, [], []);
      showToast(`${item.name} added to cart!`, "success");
    }
  };

  const getFoodEmoji = (item: MenuItem) => {
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

  if (upsellItems.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-[#E8E8E8] pb-1">
      <h4 className="text-xs font-bold text-[#1A1A1A] mb-3 flex items-center gap-1.5 select-none">
        ❤️ Customers also love
      </h4>
      
      {/* Horizontal scroll candidates */}
      <div className="flex gap-3 overflow-x-auto pb-3.5 -mx-5 px-5 scrollbar-none snap-x snap-mandatory">
        {upsellItems.map((item) => {
          const hasError = imageErrors[item.id] || false;
          return (
            <div
              key={item.id}
              className="flex shrink-0 w-[240px] rounded-xl border border-[#E8E8E8] bg-white p-2.5 snap-start shadow-sm hover:border-[#FF5C1A]/40 transition-colors duration-250 items-center gap-3 relative overflow-hidden"
            >
              {/* Image Left */}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#FAFAFA]">
                {hasError ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{
                      background: "linear-gradient(135deg, #FF5C1A 0%, #FF8C42 100%)",
                    }}
                  >
                    <span className="text-2xl">{getFoodEmoji(item)}</span>
                  </div>
                ) : (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [item.id]: true }));
                    }}
                  />
                )}
              </div>

              {/* Title & Price Right */}
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-xs font-bold text-[#1A1A1A] line-clamp-2 leading-snug">
                  {item.name}
                </p>
                <p className="text-xs font-extrabold text-[#FF5C1A] mt-1.5 tracking-tight">
                  £{item.price.toFixed(2)}
                </p>
              </div>

              {/* Green Plus Add Button bottom right */}
              <button
                onClick={(e) => handleAddClick(e, item)}
                className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-150 active:scale-90 cursor-pointer shadow border-none"
                aria-label={`Add ${item.name}`}
              >
                <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
