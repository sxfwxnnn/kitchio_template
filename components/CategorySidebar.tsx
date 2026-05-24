"use client";

import { useEffect, useRef } from "react";
import { MenuCategory } from "@/types";

interface CategorySidebarProps {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

export default function CategorySidebar({
  categories,
  activeCategory,
  onCategoryClick,
}: CategorySidebarProps) {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeCategory]);

  return (
    <aside className="hidden lg:block sticky top-20 w-[240px] shrink-0 self-start bg-white rounded-2xl border border-[#E8E8E8] p-3.5 shadow-sm text-[#1A1A1A]">
      <nav>
        <ul className="space-y-1.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <li key={cat.id} ref={isActive ? activeRef : null}>
                <button
                  onClick={() => onCategoryClick(cat.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold transition-all duration-150 active:scale-[0.98] border-l-[3px] cursor-pointer rounded-r-lg select-none ${
                    isActive
                      ? "bg-[#FFF5F0] border-[#FF5C1A] text-[#1A1A1A] font-bold"
                      : "bg-white border-transparent text-[#717171] hover:bg-[#FFF5F0]/65 hover:border-[#FF5C1A]/40 hover:text-[#1A1A1A]"
                  }`}
                >
                  {/* Dot indicator */}
                  <span
                    className={`text-[18px] leading-none shrink-0 transition-colors ${
                      isActive ? "text-[#FF5C1A]" : "text-[#717171]/40"
                    }`}
                  >
                    {isActive ? "●" : "○"}
                  </span>
                  <span className="tracking-tight truncate">{cat.name}</span>
                  <span className="ml-auto text-[10px] font-bold text-[#717171]/80 bg-[#FAFAFA] border border-[#E8E8E8] px-1.5 py-0.5 rounded-md">
                    {cat.items.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
