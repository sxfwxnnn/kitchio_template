"use client";

import { useState, useEffect } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { useToastSystem } from "./ToastSystem";
import { demoRestaurant } from "@/data/restaurant";
import { fetchPostcodeCoordinates, getDistanceMiles } from "@/lib/distance";
import { createClient } from "@/lib/supabase/client";

interface AddressModalProps {
  onValid: (address: string) => void;
}

export default function AddressModal({ onValid }: AddressModalProps) {
  const { showToast } = useToastSystem();
  
  const [streetAddress, setStreetAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [checking, setChecking] = useState(false);
  const [isCollectHighlighted, setIsCollectHighlighted] = useState(false);
  
  // Saved addresses
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true);
        // Fetch saved addresses from customer_profiles
        supabase
          .from("customer_profiles")
          .select("saved_addresses")
          .eq("customer_id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.saved_addresses && Array.isArray(data.saved_addresses)) {
              setSavedAddresses(data.saved_addresses);
            }
          });
      }
    });
  }, []);

  const handleCheckDelivery = async () => {
    if (!streetAddress.trim()) {
      showToast("Please enter a street address", "error");
      return;
    }
    if (!postcode.trim()) {
      showToast("Please enter a postcode", "error");
      return;
    }

    const uppercasePostcode = postcode.trim().toUpperCase();
    const checkingToastId = showToast(`Checking delivery to ${uppercasePostcode}...`, "info");
    
    setChecking(true);
    setIsCollectHighlighted(false);

    try {
      // 1. Resolve coordinates using postcodes.io
      const { lat, lng, formattedPostcode } = await fetchPostcodeCoordinates(uppercasePostcode);

      // 2. Compute Haversine distance
      const rLat = demoRestaurant.restaurantLat || 51.5219;
      const rLng = demoRestaurant.restaurantLng || -0.0718;
      const maxRadius = demoRestaurant.maxDeliveryRadiusMiles || 3.0;

      const distance = getDistanceMiles(lat, lng, rLat, rLng);

      if (distance <= maxRadius) {
        // SUCCESS
        const fullAddress = `${streetAddress.trim()}, ${formattedPostcode}`;
        
        // Save to localStorage
        localStorage.setItem("kitchio-address", fullAddress);
        localStorage.setItem("kitchio-postcode", formattedPostcode);
        localStorage.setItem("kitchio-lat", lat.toString());
        localStorage.setItem("kitchio-lng", lng.toString());
        localStorage.setItem("kitchio-distance", distance.toString());

        showToast(`Delivery to ${formattedPostcode} ✓`, "success", { sticky: true });
        
        // Callback
        onValid(fullAddress);
      } else {
        // FAILURE
        showToast(
          `Sorry, we don't deliver to ${formattedPostcode}. We deliver up to ${maxRadius.toFixed(1)} miles from us (you are ${distance.toFixed(1)} miles away).`,
          "error"
        );
        setIsCollectHighlighted(true);
      }
    } catch (err: any) {
      showToast(err.message || "Could not verify postcode.", "error");
      setIsCollectHighlighted(true);
    } finally {
      setChecking(false);
    }
  };

  const handleCollection = () => {
    localStorage.setItem("kitchio-address", "Collection");
    localStorage.setItem("kitchio-postcode", "collection");
    localStorage.removeItem("kitchio-lat");
    localStorage.removeItem("kitchio-lng");
    localStorage.removeItem("kitchio-distance");
    
    showToast("Collection mode selected.", "info");
    onValid("collection");
  };

  const selectSavedAddress = (addr: any) => {
    setStreetAddress(addr.streetAddress || addr.address || "");
    setPostcode(addr.postcode || "");
    setShowSavedAddresses(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-[480px] bg-white border border-[#E8E8E8] rounded-2xl p-6 md:p-8 shadow-xl animate-slide-up text-[#1A1A1A]">
        {/* Header Icon & Info */}
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-[#FF5C1A]/10 flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-[#FF5C1A]" />
          </div>
          <h2 className="text-lg font-bold">Delivery Address</h2>
          <p className="text-xs text-[#717171] mt-1.5 leading-relaxed">
            Enter your address to check delivery availability
          </p>
        </div>

        {showSavedAddresses && savedAddresses.length > 0 ? (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#717171]">Saved Addresses</span>
              <button 
                onClick={() => setShowSavedAddresses(false)} 
                className="text-xs text-[#FF5C1A] font-bold hover:underline"
              >
                Back to entry
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {savedAddresses.map((addr, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSavedAddress(addr)}
                  className="w-full text-left p-3 border border-[#E8E8E8] rounded-xl hover:bg-[#FAFAFA] transition-colors text-xs font-semibold"
                >
                  <p>{addr.streetAddress || addr.address}</p>
                  <p className="text-[10px] text-[#717171] mt-0.5">{addr.postcode}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Address Fields */
          <div className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#717171] uppercase tracking-wider">Street Address</label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="e.g. 123 High Street"
                className="w-full h-11 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 text-xs font-semibold placeholder-[#717171]/60 focus:border-[#FF5C1A] focus:outline-none transition-colors"
                disabled={checking}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#717171] uppercase tracking-wider">Postcode</label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="e.g. E13 9PJ"
                className="w-full h-11 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 text-xs font-semibold placeholder-[#717171]/60 focus:border-[#FF5C1A] focus:outline-none transition-colors uppercase"
                disabled={checking}
              />
            </div>

            {isLoggedIn && savedAddresses.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setShowSavedAddresses(true)}
                  className="text-xs text-[#FF5C1A] font-bold hover:underline"
                >
                  Back to saved addresses
                </button>
              </div>
            )}

            {/* Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleCheckDelivery}
                disabled={checking}
                className="w-full h-11 rounded-xl bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Checking availability...
                  </>
                ) : (
                  "Check Delivery"
                )}
              </button>

              <button
                onClick={handleCollection}
                disabled={checking}
                className={`w-full h-11 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                  isCollectHighlighted
                    ? "border-[#FF5C1A] bg-[#FF5C1A]/5 text-[#FF5C1A]"
                    : "border-[#E8E8E8] bg-white text-[#717171] hover:bg-[#FAFAFA] hover:text-[#1A1A1A]"
                }`}
              >
                I'll collect instead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
