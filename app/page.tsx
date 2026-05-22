"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import AddressModal from "@/components/AddressModal";

export default function MenuPage() {
  // Use demo data as fallback (Supabase fetched in data layer)
  const [restaurant] = useState<Restaurant>(demoRestaurant);
  const [menuCategories] = useState<MenuCategory[]>(demoMenuCategories);

  const [activeCategory, setActiveCategory] = useState(
    menuCategories[0]?.id || ""
  );
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [postcodeValid, setPostcodeValid] = useState(false);
  const [checkingPostcode, setCheckingPostcode] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Check if postcode is already saved
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kitchio-postcode");
      if (saved) {
        setPostcodeValid(true);
      }
    } catch {
      // Ignore
    }
    setCheckingPostcode(false);
  }, []);

  // IntersectionObserver to track which category section is visible
  useEffect(() => {
    if (!postcodeValid) return;

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
  }, [postcodeValid, menuCategories]);

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

  const handlePostcodeValid = useCallback(() => {
    setPostcodeValid(true);
  }, []);

  // Show nothing while checking localStorage
  if (checkingPostcode) return null;

  // Show postcode modal if not validated
  if (!postcodeValid) {
    return <AddressModal onValid={handlePostcodeValid} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav restaurant={restaurant} menuCategories={menuCategories} />

      {!restaurant.isOpen && <ClosedBanner />}

      <Hero restaurant={restaurant} />

      <ModeToggle />

      {/* Mobile category tabs */}
      <CategoryTabs
        categories={menuCategories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Main content area */}
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <CategorySidebar
            categories={menuCategories}
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
          />

          {/* Menu sections */}
          <div className="flex-1 space-y-10">
            {menuCategories.map((category) => (
              <MenuSection
                key={category.id}
                category={category}
                isOpen={restaurant.isOpen}
                onOpenModal={handleOpenModal}
                isActive={activeCategory === category.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Item Modal */}
      {modalItem && (
        <ItemModal item={modalItem} onClose={handleCloseModal} />
      )}

      {/* Cart Drawer */}
      <Cart restaurant={restaurant} />
    </div>
  );
}
