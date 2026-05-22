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
    <aside className="hidden lg:block sticky top-20 w-[240px] shrink-0 self-start">
      <nav>
        <ul className="space-y-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <li key={cat.id} ref={isActive ? activeRef : null}>
                <button
                  onClick={() => onCategoryClick(cat.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#F3F4F6] text-[var(--color-primary)] font-semibold"
                      : "text-[#6B6B6B] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
                  }`}
                >
                  {/* Dot indicator */}
                  <span
                    className={`text-base leading-none ${
                      isActive ? "text-[var(--color-primary)]" : "text-[#D1D5DB]"
                    }`}
                  >
                    {isActive ? "●" : "○"}
                  </span>
                  <span className="flex-1">{cat.name}</span>
                  <span
                    className={`text-xs ${
                      isActive
                        ? "text-[var(--color-primary)]/60"
                        : "text-[#D1D5DB]"
                    }`}
                  >
                    ({cat.items.length})
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
