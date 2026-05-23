"use client";

import { useState, useEffect } from "react";
import { MenuItem, SelectedOption, SelectedExtra } from "@/types";
import { useCart } from "@/context/CartContext";
import { X, Plus, Minus, ArrowLeft } from "lucide-react";
import Image from "next/image";

interface ItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export default function ItemModal({ item, onClose }: ItemModalProps) {
  const { addItem } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, { optionId: string; optionName: string; price: number }>
  >({});
  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>(
    {}
  );
  const [quantity, setQuantity] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [note, setNote] = useState("");

  // Reset state when item changes
  useEffect(() => {
    if (!item) return;
    setQuantity(1);
    setSelectedExtras({});
    setImgLoaded(false);
    setNote("");
    
    // Auto-select first choice for option groups
    const opts: Record<
      string,
      { optionId: string; optionName: string; price: number }
    > = {};
    item.optionGroups?.forEach((group) => {
      if (group.options.length > 0) {
        const first = group.options[0];
        opts[group.id] = {
          optionId: first.id,
          optionName: first.name,
          price: first.price,
        };
      }
    });
    setSelectedOptions(opts);
  }, [item]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (item) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [item]);

  if (!item) return null;

  const allRequiredSelected =
    item.optionGroups?.every(
      (group) => !group.required || selectedOptions[group.id]
    ) ?? true;

  const optionsTotal = Object.values(selectedOptions).reduce(
    (sum, o) => sum + o.price,
    0
  );
  const extrasTotal = item.extras
    .filter((e) => selectedExtras[e.id])
    .reduce((sum, e) => sum + e.price, 0);
  const unitPrice = item.price + optionsTotal + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToOrder = () => {
    if (!allRequiredSelected) return;

    const opts: SelectedOption[] = Object.entries(selectedOptions).map(
      ([groupId, opt]) => {
        const group = item.optionGroups?.find((g) => g.id === groupId);
        return {
          groupId,
          groupName: group?.name || groupId,
          optionId: opt.optionId,
          optionName: opt.optionName,
          price: opt.price,
        };
      }
    );

    const extras: SelectedExtra[] = item.extras
      .filter((e) => selectedExtras[e.id])
      .map((e) => ({ id: e.id, name: e.name, price: e.price }));

    addItem(item.id, item.name, item.price, quantity, opts, extras, note.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Premium Desktop 2-Column Modal */}
      <div
        className="relative w-full max-w-[820px] rounded-t-2xl bg-brand-card sm:rounded-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col sm:flex-row animate-slide-up shadow-2xl border border-brand-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Elevated Position */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-25 flex h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-brand-bg text-brand-text-muted shadow-lg hover:bg-brand-bg/80 hover:text-brand-text transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* LEFT SIDE: Big Beautiful Food Cover Image */}
        <div className="relative h-48 sm:h-auto sm:w-[45%] bg-brand-bg flex-shrink-0">
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className={`object-cover transition-opacity duration-300 ${
              imgLoaded ? "opacity-100 animate-fade-in" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            priority
          />
        </div>

        {/* RIGHT SIDE: Customizable Details & Options Selection */}
        <div className="flex-1 flex flex-col max-h-[60vh] sm:max-h-[80vh] bg-brand-card text-brand-text">
          {/* Options Panel Content */}
          <div className="overflow-y-auto p-6 flex-1 space-y-5">
            {/* Header info */}
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-brand-text leading-tight">{item.name}</h2>
              <p className="mt-1 text-[11px] text-brand-text-muted font-medium tracking-wide">
                Customise your order below
              </p>
            </div>

            {/* Back indicator if relevant */}
            {item.optionGroups && item.optionGroups.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-text-muted hover:text-brand-text border border-brand-border px-2.5 py-1 rounded bg-brand-bg transition-all uppercase tracking-wider"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sizes
              </button>
            )}

            {/* Option Groups (Rendered as premium Horizontal Button Chips) */}
            {item.optionGroups?.map((group) => (
              <div key={group.id} className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
                    {group.name}
                  </h3>
                  {group.required && (
                    <span className="rounded bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 text-[8px] font-bold text-brand-primary uppercase tracking-wide">
                      Required
                    </span>
                  )}
                </div>

                {/* Option Choice chips in horizontal flow */}
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((option) => {
                    const isSelected =
                      selectedOptions[group.id]?.optionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [group.id]: {
                              optionId: option.id,
                              optionName: option.name,
                              price: option.price,
                            },
                          }))
                        }
                        className={`py-2.5 px-3 text-xs font-semibold rounded-xl border text-center transition-all duration-150 active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-brand-primary border-brand-primary text-white font-bold scale-[1.01] shadow-md"
                            : "bg-brand-bg border-brand-border text-brand-text hover:border-brand-text/30 hover:bg-brand-bg"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.name}</span>
                          <span className={isSelected ? "text-white/80" : "text-brand-text-muted"}>
                            {option.price > 0 ? `+£${option.price.toFixed(2)}` : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Extras (Rendered cleanly as vertical items or list) */}
            {item.extras.length > 0 && (
              <div className="pt-4 border-t border-brand-border">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
                  Add extras
                </h3>
                <div className="space-y-1.5">
                  {item.extras.map((extra) => {
                    const isChecked = !!selectedExtras[extra.id];
                    return (
                      <label
                        key={extra.id}
                        className={`flex cursor-pointer items-center justify-between py-2 px-3 rounded-xl border transition-all duration-150 ${
                          isChecked
                            ? "border-brand-primary/30 bg-brand-primary/5"
                            : "border-brand-border bg-brand-bg hover:bg-brand-bg/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedExtras((prev) => ({
                                ...prev,
                                  [extra.id]: !prev[extra.id],
                              }))
                            }
                            className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary cursor-pointer"
                          />
                          <span className="text-xs text-brand-text font-semibold">
                            {extra.name}
                          </span>
                        </div>
                        <span className="text-xs text-brand-text-muted font-semibold font-serif">
                          +£{extra.price.toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions / Notes */}
            <div className="pt-4 border-t border-brand-border">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">
                Special Instructions (Optional)
              </h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. No onions, extra spicy, sauce on the side..."
                rows={2}
                maxLength={150}
                className="w-full rounded-xl border border-brand-border bg-brand-bg px-3 py-2 text-xs text-brand-text placeholder:text-brand-text-muted focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all resize-none"
              />
              <div className="text-right text-[9px] text-brand-text-muted mt-1">
                {note.length}/150 characters
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="border-t border-brand-border bg-brand-card p-4 flex items-center justify-between gap-4">
            {/* Quantity Selector on left */}
            <div className="flex items-center rounded-xl border border-brand-border bg-brand-bg p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-7 w-7 items-center justify-center rounded text-brand-text-muted hover:bg-brand-bg hover:text-brand-text transition-colors cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-xs font-bold text-brand-text">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded text-brand-text-muted hover:bg-brand-bg hover:text-brand-text transition-colors cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Premium Add to Cart button on right */}
            <button
              onClick={handleAddToOrder}
              disabled={!allRequiredSelected}
              className={`flex-1 flex items-center justify-between rounded-xl px-5 py-3 text-xs font-bold text-white transition-all shadow-lg cursor-pointer ${
                allRequiredSelected
                  ? "bg-brand-primary hover:bg-brand-primary/90 hover:shadow-[0_0_15px_rgba(240,90,61,0.25)] active:scale-[0.99]"
                  : "bg-zinc-900 text-zinc-500 cursor-not-allowed border border-white/5"
              }`}
            >
              <span className="uppercase tracking-wider">Add to Cart</span>
              <span className="font-serif text-sm">£{totalPrice.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
