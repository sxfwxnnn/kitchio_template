"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Restaurant, MenuCategory, MenuItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { Search, X, ShoppingBag, Sparkles } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { tenantConfig } from "@/config/tenant";

interface NavProps {
  restaurant: Restaurant;
  menuCategories: MenuCategory[];
  onDemoClick?: () => void;
}

export default function Nav({ restaurant, menuCategories, onDemoClick }: NavProps) {
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

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
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
      className={`sticky top-0 z-50 transition-all duration-150 border-b border-[#E8E8E8] ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm"
          : "bg-white"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        {/* Left: Logo + Name */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/kitchio-logo-dark.png"
            className="h-8 object-contain select-none"
            alt="Kitchio Flame Logo"
            onError={(e) => {
              e.currentTarget.src = "/img/logo.png";
            }}
          />
          <span className="h-5 w-[1px] bg-[#E8E8E8] mx-1" />
          <span className="text-sm font-extrabold text-[#1A1A1A] tracking-tight uppercase">
            {restaurant.name}
          </span>
        </div>

        {/* Centre: Search */}
        <div ref={searchRef} className="relative hidden sm:block flex-1 max-w-sm">
          <div className="flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-3.5 py-1.5 transition-all focus-within:border-[#FF5C1A] focus-within:bg-white">
            <Search className="h-4 w-4 text-[#717171] shrink-0" />
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
              className="w-full bg-transparent text-xs font-semibold text-[#1A1A1A] placeholder-[#717171]/60 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                className="text-[#717171] hover:text-[#1A1A1A] transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="animate-fade-in absolute top-full left-0 right-0 mt-2 rounded-xl border border-[#E8E8E8] bg-white shadow-lg overflow-hidden z-50">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-[#717171] font-medium">
                  No items found for &quot;{debouncedQuery}&quot;
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors border-b border-[#E8E8E8] last:border-b-0 ${
                        idx === selectedIdx
                          ? "bg-[#FAFAFA]"
                          : "hover:bg-[#FAFAFA]/50"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-[#1A1A1A]">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#717171] mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#1A1A1A] shrink-0 font-serif">
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
          {onDemoClick && (
            <button
              onClick={onDemoClick}
              className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#FF5C1A] hover:bg-orange-50 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#FF5C1A]" />
              <span>Demo Hub</span>
            </button>
          )}

          <AuthButton />

          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative flex items-center gap-1.5 rounded-xl bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 shadow-sm border-none cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            {totalItems > 0 && (
              <span className="ml-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-[#FF5C1A]">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
