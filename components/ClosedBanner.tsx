"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { checkOpeningStatus, OpeningStatus } from "@/lib/openingHours";
import { demoRestaurant } from "@/data/restaurant";
import { createClient } from "@/lib/supabase/client";

export default function ClosedBanner() {
  const [temporarilyClosed, setTemporarilyClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<OpeningStatus>({
    isOpen: true,
    message: "",
    isNearingClose: false,
    minsToClose: 0,
    reason: "none",
  });
  
  // Realtime settings subscription from Supabase
  useEffect(() => {
    const supabase = createClient();
    
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("temporarily_closed, closed_message")
        .eq("restaurant_slug", "marios-pizza") // Mario's Pizza slug default or demo slug
        .single();
      
      if (!error && data) {
        setTemporarilyClosed(data.temporarily_closed);
        setClosedMessage(data.closed_message);
      }
    };

    fetchSettings();

    const channel = supabase
      .channel("restaurant_settings_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_settings" },
        (payload) => {
          const updated = payload.new as any;
          if (updated) {
            setTemporarilyClosed(updated.temporarily_closed);
            setClosedMessage(updated.closed_message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update status check every second to keep warning banner countdown highly accurate and reactive
  useEffect(() => {
    const update = () => {
      const currentStatus = checkOpeningStatus(demoRestaurant, temporarilyClosed, closedMessage);
      setStatus(currentStatus);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [temporarilyClosed, closedMessage]);

  // If fully open and not nearing closing time, don't show the banner at all
  if (status.isOpen && !status.isNearingClose) {
    return null;
  }

  // Countdown timer calculation for display (minutes and seconds)
  const renderCountdown = () => {
    if (!status.isNearingClose) return null;

    const now = new Date();
    const closesAtStr = demoRestaurant.closesAt || "22:00";
    const [closeH, closeM] = closesAtStr.split(":").map(Number);
    const closeTime = new Date();
    closeTime.setHours(closeH, closeM, 0, 0);

    const diffMs = closeTime.getTime() - now.getTime();
    if (diffMs <= 0) return "0m 0s";

    const totalSecs = Math.floor(diffMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div
      className={`border-b transition-all duration-300 py-3.5 px-4 text-center ${
        status.isNearingClose
          ? "bg-amber-50 border-amber-200 text-amber-800"
          : "bg-rose-50 border-rose-200 text-rose-800 animate-pulse"
      }`}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-center gap-3">
        {status.isNearingClose ? (
          <Clock className="h-5 w-5 text-amber-600 shrink-0 animate-bounce" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-bold md:text-sm tracking-tight leading-none">
            {status.isNearingClose ? (
              <>
                Last orders in <span className="font-mono bg-amber-200/60 px-2 py-0.5 rounded text-amber-900 font-extrabold">{renderCountdown()}</span>! Please checkout soon.
              </>
            ) : (
              status.message
            )}
          </span>
          {!status.isOpen && (
            <span className="text-[10px] uppercase font-extrabold tracking-widest bg-rose-200/50 text-rose-900 px-2 py-0.5 rounded mt-0.5 md:mt-0 select-none">
              Ordering Locked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
