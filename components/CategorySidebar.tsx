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
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-150 active:scale-[0.98] border border-transparent cursor-pointer ${
                    isActive
                      ? "bg-brand-text/5 text-brand-text font-bold"
                      : "text-brand-text-muted hover:bg-brand-text/5 hover:text-brand-text"
                  }`}
                >
                  {/* Dot indicator */}
                  <span
                    className={`text-xs transition-colors duration-150 ${
                      isActive ? "text-brand-text" : "text-brand-text-muted/60"
                    }`}
                  >
                    {isActive ? "●" : "○"}
                  </span>
                  <span className="tracking-tight">{cat.name}</span>
                  <span className="ml-auto text-xs font-normal opacity-70">
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
