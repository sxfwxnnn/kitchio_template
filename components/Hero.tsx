"use client";

import { useEffect, useState } from "react";
import { Restaurant } from "@/types";
import { Star, Clock, MapPin } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface HeroProps {
  restaurant: Restaurant;
}

export default function Hero({ restaurant }: HeroProps) {
  const { orderMode } = useCart();
  const [address, setAddress] = useState<string | null>(null);
  const [postcode, setPostcode] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  const fetchAddressInfo = () => {
    const savedAddr = localStorage.getItem("kitchio-address");
    const savedPostcode = localStorage.getItem("kitchio-postcode");
    const savedDistance = localStorage.getItem("kitchio-distance");

    if (savedAddr && savedAddr !== "Collection") {
      setAddress(savedAddr);
      setPostcode(savedPostcode);
      setDistance(savedDistance ? parseFloat(savedDistance).toFixed(1) : null);
    } else {
      setAddress(null);
      setPostcode(null);
      setDistance(null);
    }
  };

  useEffect(() => {
    fetchAddressInfo();
    const interval = setInterval(fetchAddressInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChangeAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-address-modal"));
  };

  return (
    <div className="text-[#1A1A1A]">
      {/* Cover Image & Fallback Gradient */}
      <div className="relative h-[240px] md:h-[280px] w-full overflow-hidden bg-[#16213e]">
        {/* Fallback gradient behind the image */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
        />
        
        {/* Cover Image */}
        <img
          src={restaurant.coverImage}
          alt={`${restaurant.name} cover`}
          className="absolute inset-0 h-full w-full object-cover opacity-85"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        {/* Premium Dark Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(26,26,46,0.95) 0%, rgba(26,26,46,0.3) 60%, transparent 100%)",
          }}
        />

        {/* Content over image */}
        <div className="absolute bottom-0 left-0 right-0 z-10 mx-auto max-w-7xl px-4 pb-5 lg:px-6 animate-fade-in">
          <div className="flex items-end gap-4 translate-y-4">
            {/* Logo circle overlapping style */}
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center">
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="h-full w-full object-cover rounded-full"
                onError={(e) => {
                  e.currentTarget.src = "/img/logo.png";
                }}
              />
            </div>
            <div className="pb-1 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
              <h1 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">
                {restaurant.name}
              </h1>
              <p className="text-xs text-white/80 font-semibold">{restaurant.cuisine}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/90 font-bold">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {restaurant.rating.toFixed(1)}
                </span>
                <span className="opacity-60">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {restaurant.deliveryTime} min
                </span>
                <span className="opacity-60">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {restaurant.address.split(",").slice(-1)[0].trim()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Premium Restaurant Info Bar */}
      <div className="border-b border-[#E8E8E8] bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3.5 text-xs lg:px-6 text-[#717171] font-semibold">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Delivery{" "}
              <span className="font-bold text-[#1A1A1A]">
                £{restaurant.deliveryFee.toFixed(2)}
              </span>{" "}
              ·{" "}
              <span className="font-bold text-emerald-600">
                Free over £{restaurant.freeDeliveryOver.toFixed(2)}
              </span>
            </span>
            <span className="text-[#E8E8E8]">|</span>
            <span>
              Min order{" "}
              <span className="font-bold text-[#1A1A1A]">
                £{restaurant.minimumOrder.toFixed(2)}
              </span>
            </span>
            <span className="text-[#E8E8E8]">|</span>
            {restaurant.isOpen ? (
              <span>
                Open until{" "}
                <span className="font-bold text-[#1A1A1A]">
                  {restaurant.closesAt}
                </span>
              </span>
            ) : (
              <span className="font-bold text-rose-500 tracking-wider">CLOSED</span>
            )}
          </div>

          {/* Delivery Address Status Segment */}
          {address && postcode && orderMode === "delivery" && (
            <div className="flex items-center gap-1.5 bg-[#FF5C1A]/5 border border-[#FF5C1A]/10 py-1 px-3 rounded-lg text-[11px]">
              <span className="text-[#FF5C1A] shrink-0 font-extrabold select-none animate-pulse">📍</span>
              <span className="font-bold text-[#1A1A1A]">
                Delivering to <span className="uppercase text-[#FF5C1A]">{postcode}</span>
              </span>
              {distance && (
                <span className="text-[#717171]/80 font-medium">
                  ({distance} miles away)
                </span>
              )}
              <button
                onClick={handleChangeAddress}
                className="text-[#FF5C1A] hover:text-[#FF5C1A]/80 underline ml-1.5 font-bold cursor-pointer transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
