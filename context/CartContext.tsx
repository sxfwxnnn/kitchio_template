"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  CartItem,
  CartAction,
  OrderMode,
  SelectedOption,
  SelectedExtra,
} from "@/types";

// ============================================
// Cart Items Context (data)
// ============================================

interface CartItemsContextType {
  items: CartItem[];
  addItem: (
    itemId: string,
    name: string,
    basePrice: number,
    quantity: number,
    selectedOptions: SelectedOption[],
    selectedExtras: SelectedExtra[],
    note?: string
  ) => void;
  removeItem: (cartLineId: string) => void;
  updateQuantity: (cartLineId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

// ============================================
// Cart UI Context (UI state — separated to prevent rerenders)
// ============================================

interface CartUIContextType {
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  specialInstructions: string;
  setSpecialInstructions: (instructions: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  deliveryAddress: string | null;
  deliveryPostcode: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryDistanceMiles: number | null;
  setDeliveryInfo: (info: { address: string; postcode: string; lat: number; lng: number; distanceMiles: number } | null) => void;
}

const CartItemsContext = createContext<CartItemsContextType | null>(null);
const CartUIContext = createContext<CartUIContextType | null>(null);

function generateCartLineId(
  itemId: string,
  options: SelectedOption[],
  extras: SelectedExtra[],
  note?: string
): string {
  const optKey = options
    .map((o) => `${o.groupId}:${o.optionId}`)
    .sort()
    .join("|");
  const extKey = extras
    .map((e) => e.id)
    .sort()
    .join("|");
  const noteKey = note ? `__note:${note.trim().toLowerCase()}` : "";
  return `${itemId}__${optKey}__${extKey}${noteKey}`;
}

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD_ITEM": {
      const lineId = generateCartLineId(
        action.payload.itemId,
        action.payload.selectedOptions,
        action.payload.selectedExtras,
        action.payload.note
      );
      const existing = state.find((item) => item.cartLineId === lineId);
      if (existing) {
        return state.map((item) =>
          item.cartLineId === lineId
            ? {
                ...item,
                quantity: item.quantity + action.payload.quantity,
                totalPrice:
                  item.unitPrice * (item.quantity + action.payload.quantity),
              }
            : item
        );
      }
      const newItem: CartItem = {
        ...action.payload,
        cartLineId: lineId,
      };
      return [...state, newItem];
    }
    case "REMOVE_ITEM":
      return state.filter(
        (item) => item.cartLineId !== action.payload.cartLineId
      );
    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return state.filter(
          (item) => item.cartLineId !== action.payload.cartLineId
        );
      }
      return state.map((item) =>
        item.cartLineId === action.payload.cartLineId
          ? {
              ...item,
              quantity: action.payload.quantity,
              totalPrice: item.unitPrice * action.payload.quantity,
            }
          : item
      );
    }
    case "CLEAR_CART":
      return [];
    case "LOAD_CART":
      return action.payload;
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [orderMode, setOrderModeState] = useState<OrderMode>("delivery");
  const [specialInstructions, setSpecialInstructionsState] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Delivery details states
  const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null);
  const [deliveryPostcode, setDeliveryPostcode] = useState<string | null>(null);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [deliveryDistanceMiles, setDeliveryDistanceMiles] = useState<number | null>(null);

  const setDeliveryInfo = useCallback((info: { address: string; postcode: string; lat: number; lng: number; distanceMiles: number } | null) => {
    if (info) {
      setDeliveryAddress(info.address);
      setDeliveryPostcode(info.postcode);
      setDeliveryLat(info.lat);
      setDeliveryLng(info.lng);
      setDeliveryDistanceMiles(info.distanceMiles);

      localStorage.setItem("kitchio-address", info.address);
      localStorage.setItem("kitchio-postcode", info.postcode);
      localStorage.setItem("kitchio-lat", info.lat.toString());
      localStorage.setItem("kitchio-lng", info.lng.toString());
      localStorage.setItem("kitchio-distance", info.distanceMiles.toString());
    } else {
      setDeliveryAddress(null);
      setDeliveryPostcode(null);
      setDeliveryLat(null);
      setDeliveryLng(null);
      setDeliveryDistanceMiles(null);

      localStorage.removeItem("kitchio-address");
      localStorage.removeItem("kitchio-postcode");
      localStorage.removeItem("kitchio-lat");
      localStorage.removeItem("kitchio-lng");
      localStorage.removeItem("kitchio-distance");
    }
  }, []);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kitchio-cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          dispatch({ type: "LOAD_CART", payload: parsed });
        }
      }
      const savedMode = localStorage.getItem("kitchio-order-mode");
      if (savedMode === "delivery" || savedMode === "collection") {
        setOrderModeState(savedMode);
      }
      const savedInstructions = localStorage.getItem(
        "kitchio-special-instructions"
      );
      if (savedInstructions) {
        setSpecialInstructionsState(savedInstructions);
      }

      // Load delivery info
      const savedAddress = localStorage.getItem("kitchio-address");
      const savedPostcode = localStorage.getItem("kitchio-postcode");
      const savedLat = localStorage.getItem("kitchio-lat");
      const savedLng = localStorage.getItem("kitchio-lng");
      const savedDistance = localStorage.getItem("kitchio-distance");

      if (savedAddress && savedAddress !== "Collection") {
        setDeliveryAddress(savedAddress);
        setDeliveryPostcode(savedPostcode);
        setDeliveryLat(savedLat ? parseFloat(savedLat) : null);
        setDeliveryLng(savedLng ? parseFloat(savedLng) : null);
        setDeliveryDistanceMiles(savedDistance ? parseFloat(savedDistance) : null);
      }
    } catch {
      // Ignore localStorage errors
    }
    setLoaded(true);
  }, []);

  // Persist cart to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("kitchio-cart", JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, [items, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("kitchio-order-mode", orderMode);
  }, [orderMode, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("kitchio-special-instructions", specialInstructions);
  }, [specialInstructions, loaded]);

  const addItem = useCallback(
    (
      itemId: string,
      name: string,
      basePrice: number,
      quantity: number,
      selectedOptions: SelectedOption[],
      selectedExtras: SelectedExtra[],
      note?: string
    ) => {
      const optionsTotal = selectedOptions.reduce(
        (sum, o) => sum + o.price,
        0
      );
      const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
      const unitPrice = basePrice + optionsTotal + extrasTotal;

      dispatch({
        type: "ADD_ITEM",
        payload: {
          itemId,
          name,
          selectedOptions,
          selectedExtras,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
          note,
        },
      });
    },
    []
  );

  const removeItem = useCallback((cartLineId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { cartLineId } });
  }, []);

  const updateQuantity = useCallback(
    (cartLineId: string, quantity: number) => {
      dispatch({ type: "UPDATE_QUANTITY", payload: { cartLineId, quantity } });
    },
    []
  );

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  // Memoize computed values
  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.totalPrice, 0),
    [items]
  );

  // Memoize context values to prevent unnecessary rerenders
  const itemsValue = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal]
  );

  const setOrderMode = useCallback((mode: OrderMode) => {
    setOrderModeState(mode);
  }, []);

  const setSpecialInstructions = useCallback((instructions: string) => {
    setSpecialInstructionsState(instructions);
  }, []);

  const uiValue = useMemo(
    () => ({
      orderMode,
      setOrderMode,
      specialInstructions,
      setSpecialInstructions,
      isCartOpen,
      setIsCartOpen,
      deliveryAddress,
      deliveryPostcode,
      deliveryLat,
      deliveryLng,
      deliveryDistanceMiles,
      setDeliveryInfo,
    }),
    [
      orderMode,
      setOrderMode,
      specialInstructions,
      setSpecialInstructions,
      isCartOpen,
      setIsCartOpen,
      deliveryAddress,
      deliveryPostcode,
      deliveryLat,
      deliveryLng,
      deliveryDistanceMiles,
      setDeliveryInfo,
    ]
  );

  return (
    <CartItemsContext.Provider value={itemsValue}>
      <CartUIContext.Provider value={uiValue}>
        {children}
      </CartUIContext.Provider>
    </CartItemsContext.Provider>
  );
}

// Combined hook for backwards compatibility
export function useCart() {
  const items = useContext(CartItemsContext);
  const ui = useContext(CartUIContext);
  if (!items || !ui)
    throw new Error("useCart must be used within CartProvider");
  return { ...items, ...ui };
}

// Granular hooks for performance
export function useCartItems() {
  const ctx = useContext(CartItemsContext);
  if (!ctx)
    throw new Error("useCartItems must be used within CartProvider");
  return ctx;
}

export function useCartUI() {
  const ctx = useContext(CartUIContext);
  if (!ctx)
    throw new Error("useCartUI must be used within CartProvider");
  return ctx;
}
