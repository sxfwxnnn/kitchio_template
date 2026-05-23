"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { demoRestaurant } from "@/data/restaurant";
import { 
  Settings, 
  Save, 
  Clock, 
  Truck, 
  ShoppingBag, 
  Coins, 
  Store, 
  Loader2, 
  AlertCircle, 
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authState, setAuthState] = useState<"checking" | "ok" | "not_admin">("checking");

  // Form State
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [minimumOrder, setMinimumOrder] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [freeDeliveryOver, setFreeDeliveryOver] = useState("");
  const [closesAt, setClosesAt] = useState("22:00");
  const [isOpen, setIsOpen] = useState(true);
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  // Authenticate Admin On mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState("not_admin");
        setLoading(false);
        return;
      }
      
      const { data: adminProfile } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!adminProfile) {
        setAuthState("not_admin");
        setLoading(false);
        return;
      }

      setAuthState("ok");
      loadRestaurantSettings();
    }
    checkAuth();
  }, []);

  const loadRestaurantSettings = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("kitchio-override-restaurant");
      const active = stored ? JSON.parse(stored) : demoRestaurant;

      setRestaurantName(active.name || "Kitchio");
      setCuisine(active.cuisine || "Modern Tech Kitchen & Gourmet Delivery");
      setMinimumOrder(String(active.minimumOrder || 15.0));
      setDeliveryFee(String(active.deliveryFee || 3.0));
      setFreeDeliveryOver(String(active.freeDeliveryOver || 30.0));
      setClosesAt(active.closesAt || "22:00");
      setIsOpen(active.isOpen !== undefined ? active.isOpen : true);
      setAddress(active.address || "123 Brick Lane, London E1 6QL");
      setPostcode(active.postcode || "E1 6QL");
    } catch {
      toast.error("Failed to load restaurant settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedRestaurant = {
        ...demoRestaurant,
        name: restaurantName,
        cuisine,
        minimumOrder: parseFloat(minimumOrder || "15.00"),
        deliveryFee: parseFloat(deliveryFee || "3.00"),
        freeDeliveryOver: parseFloat(freeDeliveryOver || "30.00"),
        closesAt,
        isOpen,
        address,
        postcode
      };

      // Save locally to override dynamically across all components
      localStorage.setItem("kitchio-override-restaurant", JSON.stringify(updatedRestaurant));
      
      // Update config file simulation log
      console.log("[Settings Pipeline] Settings committed successfully:", updatedRestaurant);
      toast.success("Restaurant settings updated successfully!");
    } catch (err) {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authState === "checking") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-3" />
        <p className="text-sm font-mono">Authenticating manager credentials...</p>
      </div>
    );
  }

  if (authState === "not_admin") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
        <h1 className="text-md font-bold uppercase tracking-wider">Access Unverified</h1>
        <p className="text-xs text-zinc-400 mt-2">Only registered administrators can manage Kitchio restaurant settings.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 px-8 flex items-center justify-between shrink-0 bg-zinc-950">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-zinc-400" />
          <h1 className="text-lg font-bold tracking-tight">Restaurant Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
            {isOpen ? "Shop Open" : "Shop Closed"}
          </span>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-8 bg-zinc-950/40">
        <form onSubmit={handleSaveSettings} className="max-w-3xl space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1. General Profile Bento Module */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-zinc-350">
                <Store className="h-4.5 w-4.5 text-brand-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Restaurant Profile</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Cuisine Specialties</label>
                  <input
                    type="text"
                    required
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Address</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Postcode</label>
                    <input
                      type="text"
                      required
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Operations & Hours Bento Module */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-zinc-350">
                <Clock className="h-4.5 w-4.5 text-brand-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Hours & Status</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Closing Time</label>
                  <input
                    type="time"
                    required
                    value={closesAt}
                    onChange={(e) => setClosesAt(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Store Operations</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsOpen(true)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                        isOpen
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                          : "bg-zinc-950/60 border-zinc-800 text-zinc-450 hover:border-zinc-700"
                      }`}
                    >
                      Open For Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                        !isOpen
                          ? "bg-red-500/10 border-red-500 text-red-400"
                          : "bg-zinc-950/60 border-zinc-800 text-zinc-450 hover:border-zinc-700"
                      }`}
                    >
                      Close Shop (Closed Banner)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Delivery Pricing & Thresholds Bento Module */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4 backdrop-blur-md md:col-span-2">
              <div className="flex items-center gap-2 text-zinc-350">
                <Truck className="h-4.5 w-4.5 text-brand-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Pricing, Delivery & Basket limits</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Minimum Order Value (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={minimumOrder}
                    onChange={(e) => setMinimumOrder(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Base Delivery Fee (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Free Delivery Over (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={freeDeliveryOver}
                    onChange={(e) => setFreeDeliveryOver(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 px-3.5 text-xs text-zinc-50 font-medium focus:border-brand-primary focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="flex max-w-xs items-center justify-center gap-2 rounded-xl bg-brand-primary hover:opacity-90 py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4.5 w-4.5" />
                <span>Save Restaurant Parameters</span>
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
