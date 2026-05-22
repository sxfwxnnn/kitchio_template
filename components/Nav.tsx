"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Restaurant, MenuCategory, MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { Search, X, ShoppingBag } from "lucide-react";
import AuthButton from "@/components/AuthButton";

interface NavProps {
  restaurant: Restaurant;
  menuCategories: MenuCategory[];
}

export default function Nav({ restaurant, menuCategories }: NavProps) {
  const { totalItems, isCartOpen, setIsCartOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounce search input (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoized search results
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    const results: MenuItem[] = [];
    menuCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        ) {
          results.push(item);
        }
      });
    });
    return results;
  }, [debouncedQuery, menuCategories]);

  // Show results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setShowResults(true);
      setSelectedIdx(-1);
    } else {
      setShowResults(false);
    }
  }, [debouncedQuery]);

  const handleResultClick = useCallback((item: MenuItem) => {
    setShowResults(false);
    setSearchQuery("");
    const el = document.getElementById(`item-${item.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("item-highlight");
      setTimeout(() => el.classList.remove("item-highlight"), 1500);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showResults || searchResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
      } else if (e.key === "Enter" && selectedIdx >= 0) {
        e.preventDefault();
        handleResultClick(searchResults[selectedIdx]);
      } else if (e.key === "Escape") {
        setShowResults(false);
        inputRef.current?.blur();
      }
    },
    [showResults, searchResults, selectedIdx, handleResultClick]
  );

  return (
    <nav
      className={`sticky top-0 z-50 bg-white transition-shadow duration-150 ${
        scrolled ? "shadow-sm" : "border-b border-gray-100"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        {/* Left: Logo + Name */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-400 tracking-wide">
            kitchio
          </span>
          <span className="text-gray-200">|</span>
          <span className="text-sm font-bold text-gray-900">
            {restaurant.name}
          </span>
        </div>

        {/* Centre: Search */}
        <div ref={searchRef} className="relative hidden sm:block flex-1 max-w-md">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2 transition-colors focus-within:border-gray-400 focus-within:bg-white">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (debouncedQuery.trim()) setShowResults(true);
              }}
              className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="animate-fade-in absolute top-full left-0 right-0 mt-2 rounded-xl border border-gray-100 bg-white/95 backdrop-blur-md shadow-lg overflow-hidden z-50">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No items found for &quot;{debouncedQuery}&quot;
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-b-0 ${
                        idx === selectedIdx
                          ? "bg-gray-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">
                        £{item.price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Auth + Cart */}
        <div className="flex items-center gap-2">
          <AuthButton />

          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            {totalItems > 0 && (
              <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-gray-900">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
