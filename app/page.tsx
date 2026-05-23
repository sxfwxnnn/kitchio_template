"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { demoRestaurant, demoMenuCategories } from "@/data/restaurant";
import { Restaurant, MenuCategory, MenuItem } from "@/types";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ModeToggle from "@/components/ModeToggle";
import ClosedBanner from "@/components/ClosedBanner";
import CategorySidebar from "@/components/CategorySidebar";
import CategoryTabs from "@/components/CategoryTabs";
import MenuSection from "@/components/MenuSection";
import ItemModal from "@/components/ItemModal";
import Cart from "@/components/Cart";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import { Search, X } from "lucide-react";
import AddressModal from "@/components/AddressModal";
import DemoSelector from "@/components/DemoSelector";

// Transform raw Supabase menu_items rows into our typed MenuCategory[] structure
function buildMenuCategories(
  categories: any[],
  items: any[],
  extras: any[],
  optionGroups: any[],
  optionChoices: any[]
): MenuCategory[] {
  return categories.map((cat) => {
    const catItems = items
      .filter((item) => item.category_id === cat.id)
      .map((item) => {
        const itemExtras = extras
          .filter((e) => e.item_id === item.id)
          .map((e) => ({ id: e.id, name: e.name, price: Number(e.price) }));

        const groups = optionGroups
          .filter((g) => g.item_id === item.id)
          .map((g) => ({
            id: g.id,
            name: g.name,
            required: g.required,
            options: optionChoices
              .filter((c) => c.group_id === g.id)
              .map((c) => ({ id: c.id, name: c.name, price: Number(c.price) })),
          }));

        return {
          id: item.id,
          name: item.name,
          description: item.description || "",
          price: Number(item.price),
          image: item.image_url || "/img/menu/garlic-bread.jpg",
          available: item.available,
          isPopular: item.popular || false,
          allergens: item.allergens || [],
          calories: item.calories || 0,
          extras: itemExtras,
          optionGroups: groups.length > 0 ? groups : undefined,
        } as MenuItem;
      });

    return { id: cat.id, name: cat.name, items: catItems } as MenuCategory;
  });
}

// Client-side helper to check if a menu item matches the selected dietary filter
function matchesDietaryFilter(item: MenuItem, filter: string): boolean {
  const allergens = item.allergens || [];
  const name = item.name.toLowerCase();
  const desc = item.description.toLowerCase();

  if (filter === "vegan") {
    const hasAnimalAllergen = allergens.some((a) =>
      ["dairy", "eggs", "shellfish", "fish", "meat"].includes(a.toLowerCase())
    );
    const hasAnimalProductInText = [
      "cheese", "mozzarella", "burrata", "calamari", "pepperoni", "squid", "aioli", "mayo"
    ].some((term) => name.includes(term) || desc.includes(term));
    return !hasAnimalAllergen && !hasAnimalProductInText;
  }

  if (filter === "vegetarian") {
    const hasMeatAllergen = allergens.some((a) =>
      ["shellfish", "fish", "meat"].includes(a.toLowerCase())
    );
    const hasMeatInText = [
      "calamari", "pepperoni", "squid", "ham", "chicken"
    ].some((term) => name.includes(term) || desc.includes(term));
    return !hasMeatAllergen && !hasMeatInText;
  }

  if (filter === "gf") {
    return !allergens.some((a) => a.toLowerCase() === "gluten");
  }

  if (filter === "halal") {
    const hasPork = ["pepperoni", "ham", "bacon", "pork"].some(
      (term) => name.includes(term) || desc.includes(term)
    );
    return !hasPork;
  }

  return true;
}

export default function MenuPage() {
  const [restaurant, setRestaurant] = useState<Restaurant>(demoRestaurant);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(demoMenuCategories);
  const [menuLoaded, setMenuLoaded] = useState(false);

  // Synchronize dynamic restaurant settings override
  useEffect(() => {
    try {
      const stored = localStorage.getItem("kitchio-override-restaurant");
      if (stored) {
        setRestaurant(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const [activeCategory, setActiveCategory] = useState(
    menuCategories[0]?.id || ""
  );
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Client filtering & search states
  const [selectedDietary, setSelectedDietary] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Address modal eligibility state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);

  // Demo selector states
  const [isDemoSelectorOpen, setIsDemoSelectorOpen] = useState(false);

  // ── Live data fetch from Supabase ────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const RESTAURANT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    async function fetchMenu() {
      // 1. Check if we have a client-side demo preset selected that overrides the menu
      const activeDemo = localStorage.getItem("kitchio-demo-selected") || "1";
      if (activeDemo !== "1") {
        const { demoPresets } = require("@/config/demoPresets");
        const preset = demoPresets[activeDemo];
        if (preset && preset.menu.length > 0) {
          setMenuCategories(preset.menu);
          setActiveCategory(preset.menu[0]?.id || "");
          setMenuLoaded(true);
          return;
        }
      }

      // Default load from Supabase for option 1 (Pizza)
      try {
        const [
          { data: cats },
          { data: items },
          { data: extras },
          { data: groups },
          { data: choices },
        ] = await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .eq("restaurant_id", RESTAURANT_ID)
            .order("sort_order", { ascending: true }),
          supabase
            .from("menu_items")
            .select("*")
            .order("name", { ascending: true }),
          supabase.from("item_extras").select("*"),
          supabase.from("option_groups").select("*"),
          supabase.from("option_choices").select("*"),
        ]);

        if (cats && cats.length > 0 && items) {
          const built = buildMenuCategories(
            cats,
            items,
            extras || [],
            groups || [],
            choices || []
          );
          setMenuCategories(built);
          setActiveCategory(built[0]?.id || "");
        }
      } catch (err) {
        console.warn("[MenuPage] Supabase fetch failed, using demo data:", err);
      } finally {
        setMenuLoaded(true);
      }
    }

    fetchMenu();

    // ── Realtime subscription on menu_items ──────────────────────────────
    const channel = supabase
      .channel("menu_items_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;

          setMenuCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              items: cat.items.map((item) => {
                if (item.id !== updated.id) return item;
                return {
                  ...item,
                  available: updated.available,
                  price: Number(updated.price),
                  name: updated.name,
                  description: updated.description || item.description,
                };
              }),
            }))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── IntersectionObserver for active category tracking ──────────────────
  useEffect(() => {
    const sections = menuCategories.map((cat) =>
      document.getElementById(`category-${cat.id}`)
    );

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            const aTop = a.boundingClientRect.top;
            const bTop = b.boundingClientRect.top;
            return Math.abs(aTop) - Math.abs(bTop);
          });

        if (visible.length > 0) {
          const id = visible[0].target.id.replace("category-", "");
          setActiveCategory(id);
        }
      },
      {
        rootMargin: "-30% 0px -60% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => {
      if (section) observerRef.current?.observe(section);
    });

    return () => observerRef.current?.disconnect();
  }, [menuCategories]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    const el = document.getElementById(`category-${categoryId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleOpenModal = useCallback((item: MenuItem) => {
    setModalItem(item);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalItem(null);
  }, []);

  // Compute filtered categories based on active search and dietary filters
  const filteredMenuCategories = useMemo(() => {
    let result = menuCategories;

    // Apply dietary tag filter
    if (selectedDietary) {
      result = result.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => matchesDietaryFilter(item, selectedDietary)),
      }));
    }

    // Apply text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
        ),
      }));
    }

    return result
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => i.available !== false || true),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menuCategories, selectedDietary, searchQuery]);

  const { totalItems, subtotal, setIsCartOpen, orderMode, setOrderMode } = useCart();

  // Address verification enforcement for delivery mode
  useEffect(() => {
    const addr = localStorage.getItem("kitchio-address");
    if (addr && addr !== "collection") {
      setVerifiedAddress(addr);
      setShowAddressModal(false);
    } else if (orderMode === "delivery") {
      setShowAddressModal(true);
    } else {
      setShowAddressModal(false);
    }
  }, [orderMode]);

  const handleAddressValid = useCallback((address: string) => {
    if (address === "collection") {
      setOrderMode("collection");
      setVerifiedAddress(null);
    } else {
      setVerifiedAddress(address);
    }
    setShowAddressModal(false);
  }, [setOrderMode]);

  // Check if we need to open the demo selection on first visit
  useEffect(() => {
    const selected = localStorage.getItem("kitchio-demo-selected");
    if (!selected) {
      setIsDemoSelectorOpen(true);
    }
  }, []);

  const handleDemoSelect = useCallback((presetId: string) => {
    // Save selection
    localStorage.setItem("kitchio-demo-selected", presetId);
    const { demoPresets } = require("@/config/demoPresets");
    const preset = demoPresets[presetId];
    if (preset) {
      setRestaurant(preset.restaurant);
      localStorage.setItem("kitchio-override-restaurant", JSON.stringify(preset.restaurant));
      // Force page reload to clear old menu categories, primary colors and active states cleanly!
      window.location.reload();
    }
  }, []);

  const deliveryFee =
    orderMode === "delivery"
      ? subtotal >= restaurant.freeDeliveryOver
        ? 0
        : restaurant.deliveryFee
      : 0;
  const total = Math.max(0, subtotal + deliveryFee);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text pb-20 lg:pb-0 relative">
      <Nav restaurant={restaurant} menuCategories={menuCategories} onDemoClick={() => setIsDemoSelectorOpen(true)} />

      {!restaurant.isOpen && <ClosedBanner />}

      <Hero restaurant={restaurant} />

      <ModeToggle />

      {/* Premium Bento Dietary Filters */}
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6 flex flex-wrap gap-2 items-center">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-text-muted mr-1.5">Dietary Filters:</span>
        <button
          onClick={() => setSelectedDietary(null)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 cursor-pointer border ${
            selectedDietary === null
              ? "bg-brand-primary border-brand-primary text-brand-bg shadow-sm"
              : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-text/30"
          }`}
        >
          All Menu
        </button>
        <button
          onClick={() => setSelectedDietary(selectedDietary === "vegan" ? null : "vegan")}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${
            selectedDietary === "vegan"
              ? "bg-brand-primary border-brand-primary text-brand-bg shadow-sm"
              : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-text/30"
          }`}
        >
          <span>🌱</span> Vegan
        </button>
        <button
          onClick={() => setSelectedDietary(selectedDietary === "vegetarian" ? null : "vegetarian")}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${
            selectedDietary === "vegetarian"
              ? "bg-brand-primary border-brand-primary text-brand-bg shadow-sm"
              : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-text/30"
          }`}
        >
          <span>🥬</span> Vegetarian
        </button>
        <button
          onClick={() => setSelectedDietary(selectedDietary === "gf" ? null : "gf")}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${
            selectedDietary === "gf"
              ? "bg-brand-primary border-brand-primary text-brand-bg shadow-sm"
              : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-text/30"
          }`}
        >
          <span>🌾</span> Gluten-Free
        </button>
        <button
          onClick={() => setSelectedDietary(selectedDietary === "halal" ? null : "halal")}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${
            selectedDietary === "halal"
              ? "bg-brand-primary border-brand-primary text-brand-bg shadow-sm"
              : "bg-brand-card border-brand-border text-brand-text-muted hover:border-brand-text/30"
          }`}
        >
          <span>🥩</span> Halal
        </button>
      </div>

      {/* Desktop Inline Menu Search Component */}
      <div className="mx-auto max-w-7xl px-4 py-2 lg:px-6 hidden sm:block">
        <div className="relative max-w-md bg-brand-card border border-brand-border rounded-xl shadow-sm focus-within:border-brand-text/35 transition-all">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search our delicious dishes (e.g. Margherita)..."
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-brand-text placeholder:text-brand-text-muted focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile category tabs */}
      <CategoryTabs
        categories={filteredMenuCategories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Main content area */}
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="flex gap-8 items-start">
          {/* Desktop sidebar */}
          <CategorySidebar
            categories={filteredMenuCategories}
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
          />

          {/* Menu sections */}
          <div className="flex-1 space-y-10 min-w-0">
            {filteredMenuCategories.length === 0 ? (
              <div className="text-center py-20 bg-brand-card border border-brand-border rounded-2xl p-8">
                <p className="text-sm font-bold text-brand-text">No items found</p>
                <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                  Try clearing your dietary filters or checking your spelling!
                </p>
              </div>
            ) : (
              filteredMenuCategories.map((category) => (
                <MenuSection
                  key={category.id}
                  category={category}
                  isOpen={restaurant.isOpen}
                  onOpenModal={handleOpenModal}
                  isActive={activeCategory === category.id}
                />
              ))
            )}
          </div>

          {/* Feature 11: Sticky Desktop Cart Sidebar Total Module */}
          {totalItems > 0 && (
            <div className="w-[280px] shrink-0 sticky top-24 bg-brand-card border border-brand-border rounded-2xl p-5 shadow-lg hidden lg:flex flex-col space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-brand-border pb-3.5">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-brand-text">Sticky Cart</h3>
                  <p className="text-[10px] text-brand-text-muted mt-0.5 font-bold">Checkout ready</p>
                </div>
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-brand-text-muted">
                  <span>Selected items:</span>
                  <span className="font-bold text-brand-text">{totalItems}</span>
                </div>
                <div className="flex justify-between text-xs text-brand-text-muted">
                  <span>Basket subtotal:</span>
                  <span className="font-serif font-bold text-brand-text">£{subtotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full rounded-xl bg-brand-primary py-2.5 text-center text-xs font-bold text-brand-bg hover:opacity-90 active:scale-95 transition-all uppercase tracking-wide shadow-md cursor-pointer"
              >
                Open Basket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Item Modal */}
      {modalItem && (
        <ItemModal item={modalItem} onClose={handleCloseModal} />
      )}

      {/* Cart Drawer */}
      <Cart restaurant={restaurant} />

      {/* Mobile Floating Sticky Bottom Cart */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3.5 lg:hidden backdrop-blur-xl bg-brand-card/90 border-t border-brand-border flex items-center justify-between gap-4 animate-slide-up">
          <div className="text-sm font-medium text-brand-text flex items-center gap-1.5">
            <span className="font-bold text-brand-text">{totalItems} {totalItems === 1 ? "item" : "items"}</span>
            <span className="text-brand-text-muted">•</span>
            <span className="font-serif font-bold text-brand-text">£{total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-brand-bg shadow-md active:scale-95 transition-all uppercase tracking-wider cursor-pointer"
          >
            View Cart
          </button>
        </div>
      )}

      {/* Feature 7: Mobile Floating Search Button with Overlay Modal */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-brand-bg shadow-xl border border-brand-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
          aria-label="Search items"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Search Overlay Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[999] bg-brand-bg/95 backdrop-blur-md p-6 flex flex-col justify-start animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-text">Search Menu</h2>
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-brand-card text-brand-text hover:bg-brand-bg transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative w-full bg-brand-card border border-brand-border rounded-2xl shadow-sm focus-within:border-brand-text/35 transition-all p-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search (e.g. Pepperoni)..."
              className="w-full rounded-2xl py-3 pl-11 pr-10 text-xs font-semibold text-brand-text placeholder:text-brand-text-muted focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          <p className="mt-3.5 text-[10px] text-brand-text-muted leading-relaxed font-semibold text-center italic">
            Filters are automatically applied as you type! Tap the close button to view results.
          </p>
        </div>
      )}

      {/* Address Verification Modal */}
      {showAddressModal && (
        <AddressModal onValid={handleAddressValid} />
      )}

      {/* Demo Selector Hub Overlay */}
      <DemoSelector
        isOpen={isDemoSelectorOpen}
        onClose={() => setIsDemoSelectorOpen(false)}
        onSelect={handleDemoSelect}
      />
    </div>
  );
}
