"use client";

import { OrderStatus } from "@/types";
import { Package, CheckCircle, ChefHat, Truck, Home, Loader2 } from "lucide-react";
import React from "react";

const steps: {
  status: OrderStatus[];
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    status: ["pending", "accepted"],
    label: "Order Received",
    description: "Your order has been transmitted and is being processed by the kitchen.",
    icon: <Package className="h-4 w-4" />
  },
  {
    status: ["preparing"],
    label: "Preparing Your Feast",
    description: "Our chefs are handcrafting your meal with fresh ingredients.",
    icon: <ChefHat className="h-4 w-4" />
  },
  {
    status: ["courier_arrived"],
    label: "Courier Arrived",
    description: "Uber Direct courier has arrived at the restaurant to secure your food.",
    icon: <CheckCircle className="h-4 w-4" />
  },
  {
    status: ["out_for_delivery"],
    label: "Out for Delivery",
    description: "Your meal is en route. Prepare to receive your fresh delivery.",
    icon: <Truck className="h-4 w-4" />
  },
  {
    status: ["delivered"],
    label: "Delivered",
    description: "Completed. We hope you enjoy your Kitchio culinary experience!",
    icon: <Home className="h-4 w-4" />
  }
];

const statusOrder: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "courier_arrived",
  "out_for_delivery",
  "delivered"
];

interface OrderTrackerProps {
  currentStatus: OrderStatus;
}

const OrderTracker = React.memo(function OrderTracker({
  currentStatus,
}: OrderTrackerProps) {
  const currentIdx = statusOrder.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";

  if (isCancelled) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center animate-in fade-in duration-300">
        <p className="text-sm font-bold text-red-700 uppercase tracking-wider">
          Order Cancelled
        </p>
        <p className="mt-1 text-xs text-red-500 font-medium">
          This order was cancelled. Please contact Kitchio for help.
        </p>
      </div>
    );
  }

  return (
    <div className="relative py-2 pl-4">
      {/* Premium Vertical Connector Line */}
      <div className="absolute left-[33px] top-6 bottom-6 w-[2px] bg-zinc-100 rounded-full overflow-hidden">
        {/* Animated Active Line overlay */}
        <div 
          className="w-full bg-zinc-950 transition-all duration-500 ease-out origin-top"
          style={{
            height: `${Math.max(0, (currentIdx / (statusOrder.length - 1)) * 100)}%`
          }}
        />
      </div>

      <div className="space-y-7 relative">
        {steps.map((step, idx) => {
          // A step is completed if current index is greater than or equal to the maximum index of the step's statuses
          const stepMaxIdx = Math.max(...step.status.map(s => statusOrder.indexOf(s)));
          const isCompleted = currentIdx >= stepMaxIdx;
          const isCurrent = step.status.includes(currentStatus) || (step.status.includes("pending") && currentStatus === "accepted");

          return (
            <div 
              key={step.label}
              className={`flex items-start gap-4 transition-all duration-300 ${
                isCompleted ? "opacity-100" : "opacity-40"
              }`}
            >
              {/* Step Circle with micro-animations */}
              <div 
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 z-10 ${
                  isCompleted
                    ? "bg-zinc-950 border-zinc-950 text-white shadow-md shadow-zinc-950/10"
                    : "bg-white border-zinc-200 text-zinc-400"
                } ${isCurrent ? "ring-4 ring-zinc-950/10 scale-105" : ""}`}
              >
                {isCurrent && !isCompleted && step.status.includes("pending") ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                ) : (
                  step.icon
                )}

                {/* Pulsing indicator for active step */}
                {isCurrent && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                  </span>
                )}
              </div>

              {/* Step Details */}
              <div className="flex-1 pt-1.5">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${
                  isCompleted ? "text-zinc-900" : "text-zinc-400"
                }`}>
                  {step.label}
                </h3>
                <p className={`mt-1 text-xs leading-normal font-medium ${
                  isCompleted ? "text-zinc-500" : "text-zinc-400"
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default OrderTracker;
