"use client";

import { useCart } from "@/context/CartContext";
import { OrderMode } from "@/types";
import { demoRestaurant } from "@/data/restaurant";
import { useEffect, useState } from "react";

export default function DeliveryToggle() {
  const { orderMode, setOrderMode } = useCart();
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);

  // Poll localStorage or listen for updates to distance
  useEffect(() => {
    const checkDistance = () => {
      const savedDistance = localStorage.getItem("kitchio-distance");
      if (savedDistance) {
        setDistanceMiles(parseFloat(savedDistance));
      } else {
        setDistanceMiles(null);
      }
    };
    
    checkDistance();
    
    // Add custom event listener or standard interval polling
    const interval = setInterval(checkDistance, 1000);
    return () => clearInterval(interval);
  }, []);

  const prepTime = 20; // Prep time from config
  const driveTime = distanceMiles ? Math.ceil((distanceMiles / 0.5) * 60) : 22; // default 22 mins drive time
  const totalDeliveryTime = prepTime + driveTime;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 flex justify-center md:justify-start">
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-1 inline-flex shadow-sm gap-1 w-full max-w-xs md:max-w-sm">
        
        {/* Delivery Pill */}
        <button
          onClick={() => setOrderMode("delivery")}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-4 rounded-xl transition-all cursor-pointer ${
            orderMode === "delivery"
              ? "bg-[#FF5C1A] text-white font-bold"
              : "bg-white text-[#717171] hover:text-[#1A1A1A]"
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-extrabold">Delivery</span>
          <span className={`text-[10px] mt-0.5 font-medium ${orderMode === "delivery" ? "text-white/80" : "text-[#717171]/70"}`}>
            {totalDeliveryTime} mins
          </span>
        </button>

        {/* Collection Pill */}
        <button
          onClick={() => setOrderMode("collection")}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-4 rounded-xl transition-all cursor-pointer ${
            orderMode === "collection"
              ? "bg-[#FF5C1A] text-white font-bold"
              : "bg-white text-[#717171] hover:text-[#1A1A1A]"
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-extrabold">Collection</span>
          <span className={`text-[10px] mt-0.5 font-medium ${orderMode === "collection" ? "text-white/80" : "text-[#717171]/70"}`}>
            {prepTime} mins
          </span>
        </button>
        
      </div>
    </div>
  );
}
