"use client";

import { useCart } from "@/context/CartContext";
import { OrderMode } from "@/types";
import { Truck, Store } from "lucide-react";
import React from "react";

const ModeToggle = React.memo(function ModeToggle() {
  const { orderMode, setOrderMode } = useCart();

  const modes: {
    value: OrderMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "delivery", label: "Delivery", icon: <Truck className="h-4 w-4" /> },
    { value: "collection", label: "Collection", icon: <Store className="h-4 w-4" /> },
  ];

  return (
    <div className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
        <div className="inline-flex rounded-full border border-gray-200 p-0.5">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setOrderMode(mode.value)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                orderMode === mode.value
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ModeToggle;
