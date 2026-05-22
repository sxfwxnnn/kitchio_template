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

  // Reset state when item changes
  useEffect(() => {
    if (!item) return;
    setQuantity(1);
    setSelectedExtras({});
    setImgLoaded(false);
    
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

    addItem(item.id, item.name, item.price, quantity, opts, extras);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center bg-black/45 sm:items-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Premium Desktop 2-Column Modal */}
      <div
        className="relative w-full max-w-[820px] rounded-t-2xl bg-white sm:rounded-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col sm:flex-row animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button on Desktop/Tablet - Elevated Position */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-25 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm hover:bg-black/75 transition-colors"
          aria-label="Close"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* LEFT SIDE: Big Beautiful Food Cover Image */}
        <div className="relative h-48 sm:h-auto sm:w-[45%] bg-gray-100 flex-shrink-0">
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className={`object-cover transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgLoaded(true)}
            priority
          />
        </div>

        {/* RIGHT SIDE: Customizable Details & Options Selection */}
        <div className="flex-1 flex flex-col max-h-[60vh] sm:max-h-[80vh]">
          {/* Options Panel Content */}
          <div className="overflow-y-auto p-6 flex-1 space-y-5">
            {/* Header info */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{item.name}</h2>
              <p className="mt-1 text-xs text-gray-400">
                Hi-fidelity options custom selection
              </p>
            </div>

            {/* Back indicator if relevant */}
            {item.optionGroups && item.optionGroups.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded bg-white transition-all uppercase tracking-wider"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sizes
              </button>
            )}

            {/* Option Groups (Rendered as premium Horizontal Button Chips) */}
            {item.optionGroups?.map((group) => (
              <div key={group.id} className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {group.name}
                  </h3>
                  {group.required && (
                    <span className="rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-600 uppercase">
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
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all duration-150 ${
                          isSelected
                            ? "bg-[#0066fe] border-[#0066fe] text-white shadow-sm font-bold scale-[1.01]"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.name}</span>
                          <span className={isSelected ? "text-blue-100" : "text-gray-400"}>
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
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Add extras
                </h3>
                <div className="space-y-1">
                  {item.extras.map((extra) => {
                    const isChecked = !!selectedExtras[extra.id];
                    return (
                      <label
                        key={extra.id}
                        className={`flex cursor-pointer items-center justify-between py-2 px-2.5 rounded-lg border transition-all duration-150 ${
                          isChecked
                            ? "border-gray-900 bg-gray-50/50"
                            : "border-gray-150 hover:bg-gray-50"
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
                            className="h-4.5 w-4.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                          />
                          <span className="text-xs text-gray-900 font-medium">
                            {extra.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-semibold font-serif">
                          +£{extra.price.toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer matching inspiration */}
          <div className="border-t border-gray-100 bg-white p-4.5 flex items-center justify-between gap-4">
            {/* Quantity Selector on left */}
            <div className="flex items-center rounded-lg border border-gray-250 bg-white p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-7.5 w-7.5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-xs font-bold text-gray-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-7.5 w-7.5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Premium restaurant green Add to Cart button on right */}
            <button
              onClick={handleAddToOrder}
              disabled={!allRequiredSelected}
              className={`flex-1 flex items-center justify-between rounded-xl px-5 py-3 text-xs font-bold text-white transition-all shadow-sm ${
                allRequiredSelected
                  ? "bg-[#0F8A5F] hover:bg-[#0D7A54] active:scale-[0.99]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              }`}
            >
              <span>Add to Cart</span>
              <span className="font-serif text-sm">£{totalPrice.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
