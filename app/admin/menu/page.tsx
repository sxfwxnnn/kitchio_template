"use client";

import React, { useEffect, useState } from "react";
import { 
  createClient 
} from "@/lib/supabase/client";
import { 
  upsertMenuItem, 
  updateMenuItemPrice, 
  updateMenuItemName,
  toggleMenuItemAvailability, 
  deleteMenuItem, 
  upsertCategory, 
  deleteCategory,
  seedMenuFromDemo 
} from "@/lib/actions/admin";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Check, 
  X, 
  Database, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2, 
  PlusCircle, 
  AlertCircle,
  Flame,
  Search
} from "lucide-react";
import { toast } from "sonner";

export default function MenuManagerPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Category CRUD States
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Item Modal States
  const [showItemModal, setShowItemModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [itemSubmitting, setItemSubmitting] = useState(false);
  
  // Item Form Fields
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCalories, setItemCalories] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemPopular, setItemPopular] = useState(false);
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);

  // Seeding State
  const [seeding, setSeeding] = useState(false);

  // Inline pricing / name editing tracking
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Delete confirmations
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (catError) throw catError;

      const { data: itemData, error: itemError } = await supabase
        .from("menu_items")
        .select("*")
        .order("name", { ascending: true });

      if (itemError) throw itemError;

      const { data: overrideData } = await supabase
        .from("menu_item_overrides")
        .select("*")
        .eq("restaurant_slug", "marios-pizza");

      const mergedItems = (itemData || []).map(item => {
        const o = overrideData?.find(x => x.item_id === item.id);
        if (o) {
          return {
            ...item,
            available: o.available !== null ? o.available : item.available,
            popular: o.is_popular !== null ? o.is_popular : item.popular,
            price: o.price_override !== null ? Number(o.price_override) : item.price,
          };
        }
        return item;
      });

      setCategories(catData || []);
      setMenuItems(mergedItems);

      if (catData && catData.length > 0) {
        // Retain selection if valid, else fallback to first category
        const currentSelectedStillExists = catData.some(c => c.id === selectedCategoryId);
        if (!currentSelectedStillExists) {
          setSelectedCategoryId(catData[0].id);
        }
      } else {
        setSelectedCategoryId("");
      }
    } catch (err: any) {
      toast.error(`Failed to fetch database index: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedMenu = async () => {
    setSeeding(true);
    try {
      const result = await seedMenuFromDemo();
      if (result.status === "already_seeded") {
        toast.info("Database menu index is already populated.");
      } else {
        toast.success(`Success! Seeded ${result.count} core menu items.`);
        await loadData();
      }
    } catch (err: any) {
      toast.error(`On-demand seed failure: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCategorySubmitting(true);
    try {
      const result = await upsertCategory({
        name: newCategoryName.trim(),
        sort_order: categories.length + 1
      });
      toast.success(`Category "${result.name}" registered successfully.`);
      setNewCategoryName("");
      setShowAddCategory(false);
      await loadData();
      setSelectedCategoryId(result.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      await deleteCategory(catId);
      toast.success("Category deleted.");
      setCategoryToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  const openAddItemModal = () => {
    setModalMode("add");
    setEditingItemId(null);
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemCalories("");
    setItemCategory(selectedCategoryId || (categories[0]?.id || ""));
    setItemPopular(false);
    setItemImageUrl("/img/menu/garlic-bread.jpg");
    setItemAvailable(true);
    setShowItemModal(true);
  };

  const openEditItemModal = (item: any) => {
    setModalMode("edit");
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemDescription(item.description || "");
    setItemPrice(String(item.price));
    setItemCalories(String(item.calories || 0));
    setItemCategory(item.category_id);
    setItemPopular(item.popular || false);
    setItemImageUrl(item.image_url || "/img/menu/garlic-bread.jpg");
    setItemAvailable(item.available);
    setShowItemModal(true);
  };

  const handleSaveItemForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice || !itemCategory) {
      toast.error("Please fill in all required fields (Name, Price, Category).");
      return;
    }

    setItemSubmitting(true);
    try {
      const payload: any = {
        category_id: itemCategory,
        name: itemName.trim(),
        description: itemDescription.trim(),
        price: Number(itemPrice),
        image_url: itemImageUrl || "/img/menu/garlic-bread.jpg",
        available: itemAvailable,
        popular: itemPopular,
        calories: itemCalories ? parseInt(itemCalories) : 0,
      };

      if (modalMode === "edit" && editingItemId) {
        payload.id = editingItemId;
      }

      await upsertMenuItem(payload);
      toast.success(
        modalMode === "add" 
          ? `Product "${itemName}" added successfully.` 
          : `Product details saved.`
      );
      setShowItemModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save menu item");
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      await deleteMenuItem(itemId);
      toast.success("Menu item removed.");
      setItemToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  const handleToggleAvailable = async (itemId: string, currentVal: boolean) => {
    setUpdatingItemId(itemId);
    const nextVal = !currentVal;
    try {
      // Optimistic update
      setMenuItems(prev => 
        prev.map(i => i.id === itemId ? { ...i, available: nextVal } : i)
      );

      const { error } = await supabase
        .from("menu_item_overrides")
        .upsert({
          restaurant_slug: "marios-pizza",
          item_id: itemId,
          available: nextVal,
          updated_at: new Date().toISOString()
        }, { onConflict: "restaurant_slug,item_id" });

      if (error) throw error;
      toast.success(nextVal ? "Product marked available" : "Product marked out of stock");
    } catch (err: any) {
      toast.error("Failed to toggle availability");
      // Revert optimistic update
      setMenuItems(prev => 
        prev.map(i => i.id === itemId ? { ...i, available: currentVal } : i)
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleTogglePopular = async (itemId: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    try {
      setMenuItems(prev =>
        prev.map(i => i.id === itemId ? { ...i, popular: nextVal } : i)
      );

      const { error } = await supabase
        .from("menu_item_overrides")
        .upsert({
          restaurant_slug: "marios-pizza",
          item_id: itemId,
          is_popular: nextVal,
          updated_at: new Date().toISOString()
        }, { onConflict: "restaurant_slug,item_id" });

      if (error) throw error;
      toast.success(nextVal ? "Product marked as Popular" : "Product unmarked from Popular");
    } catch (err: any) {
      toast.error("Failed to toggle popularity: " + err.message);
      setMenuItems(prev =>
        prev.map(i => i.id === itemId ? { ...i, popular: currentVal } : i)
      );
    }
  };

  const startEditPrice = (itemId: string, currentPrice: number) => {
    setEditingPrices(prev => ({
      ...prev,
      [itemId]: String(currentPrice)
    }));
  };

  const cancelEditPrice = (itemId: string) => {
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handleSavePrice = async (itemId: string) => {
    const val = editingPrices[itemId];
    if (!val || isNaN(Number(val)) || Number(val) < 0) {
      toast.error("Please enter a valid non-negative price.");
      return;
    }

    setUpdatingItemId(itemId);
    try {
      const priceNum = Number(val);
      
      const { error } = await supabase
        .from("menu_item_overrides")
        .upsert({
          restaurant_slug: "marios-pizza",
          item_id: itemId,
          price_override: priceNum,
          updated_at: new Date().toISOString()
        }, { onConflict: "restaurant_slug,item_id" });

      if (error) throw error;

      setMenuItems(prev => 
        prev.map(i => i.id === itemId ? { ...i, price: priceNum } : i)
      );
      cancelEditPrice(itemId);
      toast.success("Price updated successfully.");
    } catch (err: any) {
      toast.error("Failed to save price changes.");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const startEditName = (itemId: string, currentName: string) => {
    setEditingNames(prev => ({
      ...prev,
      [itemId]: currentName
    }));
  };

  const cancelEditName = (itemId: string) => {
    setEditingNames(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handleSaveName = async (itemId: string) => {
    const val = editingNames[itemId];
    if (!val || !val.trim()) {
      toast.error("Please enter a valid product name.");
      return;
    }

    setUpdatingItemId(itemId);
    try {
      const trimmedName = val.trim();
      await updateMenuItemName(itemId, trimmedName);
      setMenuItems(prev => 
        prev.map(i => i.id === itemId ? { ...i, name: trimmedName } : i)
      );
      cancelEditName(itemId);
      toast.success("Product name updated.");
    } catch (err: any) {
      toast.error("Failed to save product name changes.");
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Filter menu items by active category and search filter query
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = item.category_id === selectedCategoryId;
    const matchesSearch = searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesCategory && matchesSearch;
  });

  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || "";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      {/* Top operational menu panel header */}
      <header className="h-16 border-b border-zinc-900 px-8 flex items-center justify-between shrink-0 bg-zinc-950">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight">Menu & Price Manager</h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-pulse" />
            Active Mode: Live Editor
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedMenu}
            disabled={seeding || loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-800/80 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {seeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5 text-zinc-400" />
            )}
            Seed Demo Data
          </button>

          <button
            onClick={openAddItemModal}
            disabled={categories.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded-lg text-xs font-bold hover:bg-white active:scale-[0.98] transition-all cursor-pointer shadow disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3px]" />
            New Item
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-mono text-sm">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-2" />
          Synchronizing with Supabase Data Layer...
        </div>
      ) : categories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
          <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400 mb-5">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <h2 className="text-base font-bold text-zinc-200">No Categories Found</h2>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            Your Supabase schema is active but no category folders are loaded yet. Create your first category folder or seed our full artisan demo menu.
          </p>
          <div className="flex flex-col gap-3 w-full mt-6">
            <button
              onClick={handleSeedMenu}
              disabled={seeding}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Seeding Platform...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  Seed Full Kitchio Menu
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddCategory(true)}
              className="py-2.5 rounded-xl border border-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-900 transition-all cursor-pointer"
            >
              Or Create Category Manually
            </button>
          </div>

          {/* Add Category Drawer overlay */}
          {showAddCategory && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleCreateCategory} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
                <h3 className="text-sm font-bold text-zinc-100">Add New Category Bucket</h3>
                <p className="text-xs text-zinc-500 mt-1">This registers a structural tab container for your menu groups.</p>
                <div className="mt-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Category Name</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Starters, Gourmet Pizzas"
                    className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                    autoFocus
                  />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(false)}
                    className="px-3 py-2 text-xs font-bold text-zinc-450 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={categorySubmitting}
                    className="px-3 py-2 text-xs font-bold bg-zinc-50 text-zinc-950 rounded-lg hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {categorySubmitting ? "Creating..." : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left high-density category side bar */}
          <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col justify-between shrink-0">
            <div className="p-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-zinc-500">Categories ({categories.length})</span>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer hover:border-zinc-700 transition-colors"
                  title="Add Category Bucket"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Category selector array */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {categories.map((cat) => {
                  const isActive = cat.id === selectedCategoryId;
                  const hasConfirmDelete = categoryToDelete === cat.id;
                  const catItemCount = menuItems.filter(i => i.category_id === cat.id).length;

                  return (
                    <div key={cat.id} className="group relative">
                      {!hasConfirmDelete ? (
                        <div
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                            isActive
                              ? "bg-zinc-900 text-zinc-100 font-semibold border border-zinc-800/80 shadow"
                              : "text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900/30"
                          }`}
                        >
                          <span className="truncate pr-4">{cat.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-850 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                              {catItemCount}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryToDelete(cat.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-red-400 cursor-pointer transition-all hover:bg-zinc-800/40"
                              title="Delete category"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-2 flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-100">
                          <span className="text-[10px] text-red-400 font-semibold leading-tight">Delete and purge category?</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="flex-1 bg-red-650 hover:bg-red-650/80 text-white font-bold text-[10px] py-1 px-1.5 rounded transition-all cursor-pointer text-center"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setCategoryToDelete(null)}
                              className="border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-[10px] py-1 px-1.5 rounded transition-all cursor-pointer text-center"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar bottom guide indicator */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-900/10">
              <div className="flex items-start gap-2.5 text-[11px] text-zinc-500 leading-relaxed">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-650" />
                <div>
                  <span className="font-semibold text-zinc-400 block">Staff Notice</span>
                  Prices saved inline apply immediately to current active web users.
                </div>
              </div>
            </div>
          </aside>

          {/* Right main items panel */}
          <section className="flex-1 flex flex-col overflow-hidden bg-zinc-950/40">
            {/* Search and item metrics filter header */}
            <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between shrink-0 bg-zinc-950/20">
              <div className="flex items-center gap-3 w-64 relative">
                <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${selectedCategoryName || "items"}...`}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-800 transition-colors"
                />
              </div>

              <div className="text-[11px] text-zinc-500 font-mono">
                Showing {filteredItems.length} products in Category: <span className="text-zinc-400 font-semibold">{selectedCategoryName}</span>
              </div>
            </div>

            {/* Item list viewport */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                  <UtensilsIcon className="h-8 w-8 text-zinc-700 mb-3" />
                  <p className="text-xs font-bold text-zinc-400">Empty Category Bucket</p>
                  <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                    {searchQuery ? "No products matched your active filters." : "Create items in this category or switch filters to modify menu records."}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={openAddItemModal}
                      className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 rounded-lg text-xs font-bold text-zinc-300 transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Product
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-zinc-900 bg-zinc-900/10 rounded-xl overflow-hidden shadow">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-500 bg-zinc-950/30">
                        <th className="py-3 px-4 w-1/3">Product details</th>
                        <th className="py-3 px-3">Price</th>
                        <th className="py-3 px-3">Calories</th>
                        <th className="py-3 px-3">Special tags</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 text-xs">
                      {filteredItems.map((item) => {
                        const isPricing = editingPrices[item.id] !== undefined;
                        const isNaming = editingNames[item.id] !== undefined;
                        const isPending = updatingItemId === item.id;
                        const isConfirmingDelete = itemToDelete === item.id;

                        return (
                          <tr key={item.id} className="hover:bg-zinc-900/10 group transition-all duration-150">
                            {/* Product Name & Description */}
                            <td className="py-3.5 px-4 max-w-[280px]">
                              {isNaming ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingNames[item.id]}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setEditingNames(prev => ({ ...prev, [item.id]: text }));
                                    }}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-semibold flex-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveName(item.id);
                                      if (e.key === "Escape") cancelEditName(item.id);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveName(item.id)}
                                    className="p-1 rounded bg-zinc-900 text-emerald-400 hover:text-emerald-350 cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => cancelEditName(item.id)}
                                    className="p-1 rounded bg-zinc-900 text-zinc-500 hover:text-zinc-350 cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-zinc-250 leading-tight group-hover:text-zinc-100 transition-colors">
                                      {item.name}
                                    </span>
                                    <button
                                      onClick={() => startEditName(item.id, item.name)}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-550 hover:text-zinc-350 cursor-pointer transition-all"
                                      title="Edit Name"
                                    >
                                      <Edit3 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 truncate mt-1 leading-normal">
                                    {item.description || "No description provided."}
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* Inline Pricing Field */}
                            <td className="py-3.5 px-3">
                              {isPricing ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-zinc-500">£</span>
                                  <input
                                    type="text"
                                    value={editingPrices[item.id]}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setEditingPrices(prev => ({ ...prev, [item.id]: text }));
                                    }}
                                    className="w-14 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSavePrice(item.id);
                                      if (e.key === "Escape") cancelEditPrice(item.id);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSavePrice(item.id)}
                                    className="p-1 rounded bg-zinc-900 text-emerald-400 hover:text-emerald-350 cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => cancelEditPrice(item.id)}
                                    className="p-1 rounded bg-zinc-900 text-zinc-500 hover:text-zinc-350 cursor-pointer"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 group/price font-semibold font-mono">
                                  <span className="text-zinc-300">£{Number(item.price).toFixed(2)}</span>
                                  <button
                                    onClick={() => startEditPrice(item.id, item.price)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-550 hover:text-zinc-350 cursor-pointer transition-all"
                                    title="Edit Price"
                                  >
                                    <Edit3 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Calories Field */}
                            <td className="py-3.5 px-3 font-mono text-zinc-450">
                              {item.calories ? `${item.calories} kcal` : "—"}
                            </td>

                            {/* Popularity indicator tags */}
                            <td className="py-3.5 px-3">
                              <button
                                type="button"
                                onClick={() => handleTogglePopular(item.id, item.popular)}
                                className={`inline-flex items-center gap-1 text-[9px] font-bold font-mono tracking-wide uppercase px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                                  item.popular
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400"
                                }`}
                              >
                                <Flame className={`h-2.5 w-2.5 ${item.popular ? "text-amber-400 fill-amber-400/20" : ""}`} />
                                Popular
                              </button>
                            </td>

                            {/* Availability Toggle Switch */}
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleToggleAvailable(item.id, item.available)}
                                className={`inline-flex items-center justify-center p-1 rounded-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
                                  item.available 
                                    ? "text-emerald-450 hover:bg-emerald-500/5 hover:text-emerald-400" 
                                    : "text-zinc-600 hover:bg-zinc-900 hover:text-zinc-550"
                                }`}
                                title={item.available ? "Mark Out of Stock" : "Mark Available"}
                              >
                                {item.available ? (
                                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase font-mono tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                    <Eye className="h-3 w-3 shrink-0" /> Available
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase font-mono tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                                    <EyeOff className="h-3 w-3 shrink-0" /> Hidden
                                  </div>
                                )}
                              </button>
                            </td>

                            {/* Action Row Buttons */}
                            <td className="py-3.5 px-4 text-right">
                              {!isConfirmingDelete ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openEditItemModal(item)}
                                    className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 hover:text-zinc-250 text-zinc-400 transition-all cursor-pointer"
                                    title="Edit details"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setItemToDelete(item.id)}
                                    className="p-1.5 rounded-lg border border-red-950/20 bg-red-950/5 hover:bg-red-950/20 hover:text-red-400 text-red-500/80 transition-all cursor-pointer"
                                    title="Remove item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5 animate-in slide-in-from-right-1 duration-100">
                                  <span className="text-[10px] font-bold text-red-400 mr-1.5">Purge?</span>
                                  <button
                                    onClick={() => handleDeleteMenuItem(item.id)}
                                    className="bg-red-650 text-white font-bold text-[10px] py-1 px-2 rounded hover:bg-red-550 transition-colors cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setItemToDelete(null)}
                                    className="border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-[10px] py-1 px-2 rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Add / Edit Item modal dialog backdrop */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-5">
              <h3 className="text-sm font-bold text-zinc-100">
                {modalMode === "add" ? "Register New Product" : "Edit Product Details"}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Buffalo Mozzarella Margherita"
                    className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Price * (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="12.50"
                    className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Category Folder *</label>
                  <select
                    required
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-350 focus:outline-none focus:border-zinc-700 font-medium cursor-pointer"
                  >
                    <option value="" disabled>Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Product Description</label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Describe your crust thickness, wild-caught ingredients, spices, or sweet notes..."
                  className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Calories (kcal)</label>
                  <input
                    type="number"
                    value={itemCalories}
                    onChange={(e) => setItemCalories(e.target.value)}
                    placeholder="e.g. 520"
                    className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Image Asset URL</label>
                  <input
                    type="text"
                    value={itemImageUrl}
                    onChange={(e) => setItemImageUrl(e.target.value)}
                    placeholder="/img/menu/garlic-bread.jpg"
                    className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 border-t border-zinc-800/40 pt-4 mt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemPopular}
                    onChange={(e) => setItemPopular(e.target.checked)}
                    className="h-4 w-4 bg-zinc-950 border-zinc-800 rounded accent-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-250 block">Mark as Popular</span>
                    <span className="text-[10px] text-zinc-500 block leading-tight">Highlights item on shop front with a flame icon.</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemAvailable}
                    onChange={(e) => setItemAvailable(e.target.checked)}
                    className="h-4 w-4 bg-zinc-950 border-zinc-800 rounded accent-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-250 block">Published status</span>
                    <span className="text-[10px] text-zinc-500 block leading-tight">Determines visibility to active shopping sessions.</span>
                  </div>
                </label>
              </div>

              <div className="border-t border-zinc-800/60 pt-4 mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-455 hover:text-zinc-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={itemSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-zinc-50 text-zinc-950 rounded-xl hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {itemSubmitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual category creation dialog overlay (when category selector side drawer has it open) */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCategory} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-100">Add New Category Bucket</h3>
            <p className="text-xs text-zinc-500 mt-1">This registers a structural tab container for your menu groups.</p>
            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-400">Category Name</label>
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Starters, Gourmet Pizzas"
                className="w-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCategory(false)}
                className="px-3 py-2 text-xs font-bold text-zinc-450 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={categorySubmitting}
                className="px-3 py-2 text-xs font-bold bg-zinc-50 text-zinc-950 rounded-lg hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {categorySubmitting ? "Creating..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Custom icons to bypass missing lucide-react imports cleanly
function UtensilsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}
