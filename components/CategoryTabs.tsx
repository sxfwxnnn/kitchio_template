"use client";

import { useEffect, useRef } from "react";
import { MenuCategory } from "@/types";

interface CategoryTabsProps {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onCategoryClick,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const tab = activeTabRef.current;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      if (
        tabRect.left < containerRect.left ||
        tabRect.right > containerRect.right
      ) {
        tab.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeCategory]);

  return (
    <div className="lg:hidden sticky top-[64px] z-30 border-b border-[#E8E8E8] bg-white/95 backdrop-blur-xl">
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-2.5 overflow-x-auto px-4 py-3"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onCategoryClick(cat.id)}
              className={`shrink-0 rounded-full border px-4.5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer select-none ${
                isActive
                  ? "border-[#FF5C1A] bg-[#FF5C1A] text-white shadow-sm"
                  : "border-[#E8E8E8] bg-white text-[#717171] hover:border-[#717171]/35 hover:text-[#1A1A1A]"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
