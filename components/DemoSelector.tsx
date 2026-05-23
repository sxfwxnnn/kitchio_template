"use client";

import { demoPresets, DemoPreset } from "@/config/demoPresets";
import { X, Sparkles, Pizza, CupSoda, Pill, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DemoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (presetId: string) => void;
}

export default function DemoSelector({ isOpen, onClose, onSelect }: DemoSelectorProps) {
  const [activePreset, setActivePreset] = useState("1");

  useEffect(() => {
    const saved = localStorage.getItem("kitchio-demo-selected") || "1";
    setActivePreset(saved);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (preset: DemoPreset) => {
    localStorage.setItem("kitchio-demo-selected", preset.id);
    localStorage.setItem("kitchio-override-restaurant", JSON.stringify(preset.restaurant));
    toast.success(`Demo switched to ${preset.name}!`, {
      description: "Enjoy the gourmet local commerce simulation.",
      duration: 3500,
    });
    onSelect(preset.id);
    onClose();
  };

  const getIcon = (id: string) => {
    switch (id) {
      case "1":
        return <Pizza className="h-5 w-5 text-amber-500" />;
      case "2":
        return <CupSoda className="h-5 w-5 text-rose-500" />;
      case "3":
        return <Pill className="h-5 w-5 text-teal-500" />;
      case "4":
        return <ShoppingBag className="h-5 w-5 text-blue-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4 font-sans select-none">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest font-mono">
            Kitchio Demo Hub
          </h2>
          <p className="text-xs text-amber-500 mt-1 uppercase font-mono tracking-wider font-extrabold">
            Universal Local Commerce Platform
          </p>
          <div className="w-16 h-0.5 bg-zinc-800 my-4" />
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            Evaluate how Kitchio dynamically adapts its colors, branding, and inventories to any business sector on a single unified engine.
          </p>
        </div>

        {/* Bento presets grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.values(demoPresets).map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelect(preset)}
                className={`relative flex items-start gap-4 text-left p-4 rounded-2xl border transition-all duration-100 cursor-pointer ${
                  isSelected
                    ? "bg-zinc-950 border-brand-accent/50 text-white shadow-[0_0_15px_rgba(197,168,128,0.12)]"
                    : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-950/70 hover:border-zinc-700 text-zinc-300"
                }`}
              >
                {/* Visual marker */}
                {isSelected && (
                  <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}

                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center shrink-0 shadow-inner">
                  {getIcon(preset.id)}
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide">
                    {preset.name}
                  </h3>
                  <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-wider font-mono font-bold">
                    Option {preset.id}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                    {preset.cuisine}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
