"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { demoRestaurant } from "@/data/restaurant";
import { createPaymentIntent } from "@/lib/actions/checkout";
import { createOrder } from "@/lib/actions/orders";
import { createClient } from "@/lib/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User as UserIcon,
  Loader2,
  ShoppingBag,
  AlertCircle,
  ShieldCheck,
  Zap,
  Clock,
  CreditCard,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";


// Custom premium styling options for Stripe Elements to match the white-label branding
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#1f2937", // tailwind text-gray-800
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "14px",
      "::placeholder": {
        color: "#9ca3af", // tailwind text-gray-400
      },
    },
    invalid: {
      color: "#ef4444", // tailwind text-red-500
      iconColor: "#ef4444",
    },
  },
};

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// Standard Kitchio schedule slots ( Kitchio closes at 22:00 )
const SCHEDULE_TIME_SLOTS = [
  "17:30 - 18:00",
  "18:00 - 18:30",
  "18:30 - 19:00",
  "19:00 - 19:30",
  "19:30 - 20:00",
  "20:00 - 20:30",
  "20:30 - 21:00",
  "21:00 - 21:30",
  "21:30 - 22:00",
];

function CheckoutForm() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const { items, orderMode, subtotal, specialInstructions, clearCart } =
    useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  // Guard to prevent the empty-cart redirect from firing when we intentionally redirect after checkout
  const [isRedirectingToOrder, setIsRedirectingToOrder] = useState(false);

  // Time preference states
  const [deliveryTimeMode, setDeliveryTimeMode] = useState<"asap" | "schedule">("asap");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(SCHEDULE_TIME_SLOTS[0]);

  // Promo code states
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState("");

  // Tip states
  const [tipPercentage, setTipPercentage] = useState<number | null>(null); // null, 10, 15, 20
  const [customTip, setCustomTip] = useState<string>("");
  const [tipAmount, setTipAmount] = useState<number>(0);

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("kitchio-saved-addresses") || "[]");
      setSavedAddresses(stored);
    } catch {
      // Ignore
    }
  }, []);

  // Use demo restaurant state with dynamic settings override
  const [restaurant, setRestaurant] = useState(demoRestaurant);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("kitchio-override-restaurant");
      if (stored) {
        setRestaurant(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const [postcodeDeliveryFee, setPostcodeDeliveryFee] = useState<number | null>(null);

  // Update postcode delivery fee dynamically when deliveryAddress changes
  useEffect(() => {
    if (orderMode !== "delivery" || !deliveryAddress) {
      setPostcodeDeliveryFee(null);
      return;
    }
    
    // Attempt to extract postcode using regex (UK postcode format)
    const ukPostcodeRegex = /([A-Z][A-HJ-Y]?\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0A{2})/i;
    const match = deliveryAddress.match(ukPostcodeRegex);
    if (match) {
      const postcode = match[0];
      try {
        const { getPostcodeDeliveryFee } = require("@/lib/postcode");
        const fee = getPostcodeDeliveryFee(postcode);
        if (fee !== null) {
          setPostcodeDeliveryFee(fee);
        }
      } catch (e) {
        console.error("Failed to load postcode delivery fee utility:", e);
      }
    }
  }, [deliveryAddress, orderMode]);

  const deliveryFee =
    orderMode === "delivery"
      ? subtotal >= restaurant.freeDeliveryOver
        ? 0
        : (postcodeDeliveryFee !== null ? postcodeDeliveryFee : restaurant.deliveryFee)
      : 0;

  // Calculate discounts (Promo only, points system removed)
  const discount = promoDiscount;

  const total = Math.max(0, subtotal + deliveryFee + tipAmount - discount);

  // Dynamic tip amount sync
  useEffect(() => {
    if (tipPercentage !== null) {
      setTipAmount(Number((subtotal * (tipPercentage / 100)).toFixed(2)));
      setCustomTip("");
    } else if (customTip) {
      const parsed = parseFloat(customTip);
      setTipAmount(isNaN(parsed) || parsed < 0 ? 0 : Number(parsed.toFixed(2)));
    } else {
      setTipAmount(0);
    }
  }, [tipPercentage, customTip, subtotal]);

  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState<boolean>(false);

  // Initialize Stripe Payment Request Button (Apple Pay & Google Pay)
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: "GB",
      currency: "gbp",
      total: {
        label: "Kitchio Order",
        amount: Math.round(total * 100), // in pence
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
    });

    pr.canMakePayment().then((result: any) => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      }
    });

    pr.on("paymentmethod", async (ev: any) => {
      try {
        const finalInstructions = [
          specialInstructions,
          deliveryTimeMode === "schedule" ? `[Scheduled Delivery Time: ${selectedTimeSlot}]` : null,
          "[Express Apple/Google Pay]"
        ].filter(Boolean).join(" ");

        // 1. Create the order in Supabase
        const { order, error: orderError } = await createOrder({
          restaurantId: restaurant.id,
          items,
          subtotal,
          deliveryFee,
          tip: tipAmount,
          total,
          deliveryMode: orderMode,
          customerName: ev.payerName || customerName || "Express Guest",
          customerPhone: ev.payerPhone || customerPhone || "0000000000",
          deliveryAddress: orderMode === "delivery" ? (ev.shippingAddress?.addressLine?.join(", ") || deliveryAddress || "Express Shipping Address") : null,
          specialInstructions: finalInstructions,
          stripePaymentIntent: ev.paymentMethod.id,
        });

        if (orderError || !order) {
          ev.complete("fail");
          setError(orderError || "Failed to create express order");
          return;
        }

        // 2. Initialize the backend payment intent
        const { clientSecret, error: intentError } = await createPaymentIntent({
          orderId: order.id,
          total,
          stripeAccountId: restaurant.stripeAccountId,
        });

        if (intentError || !clientSecret) {
          ev.complete("fail");
          setError(intentError || "Failed to initialize payment");
          return;
        }

        // 3. Confirm payment intent with payment method ID
        const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete("fail");
          setError(confirmError.message || "Payment declined");
          return;
        }

        ev.complete("success");

        // Finalize order status on the server
        try {
          const { finalizeStripeOrderPayment } = await import("@/lib/actions/orders");
          await finalizeStripeOrderPayment(order.id, paymentIntent.id);
        } catch (finalizeErr) {
          console.error("Failed to finalize order payment status on server:", finalizeErr);
        }

        setIsRedirectingToOrder(true);
        clearCart();
        window.location.href = `/orders/${order.id}`;
      } catch (err) {
        ev.complete("fail");
        setError(err instanceof Error ? err.message : "Express payment failed");
      }
    });
  }, [stripe, total, items, subtotal, deliveryFee, tipAmount, orderMode, deliveryAddress, specialInstructions, deliveryTimeMode, selectedTimeSlot]);

  const minimumMet =
    subtotal >= restaurant.minimumOrder || orderMode === "collection";

  // Check auth status & load profile details
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      if (user?.user_metadata?.full_name) {
        setCustomerName(user.user_metadata.full_name);
      }
      if (user?.email) {
        setCustomerEmail(user.email);
      }
      // Start with blank address so they MUST search/type their own
      setDeliveryAddress("");
      setAuthChecked(true);
    });
  }, []);

  // Load and auto-apply saved promo code from localStorage on mount
  useEffect(() => {
    if (!subtotal) return;
    const savedPromo = localStorage.getItem("kitchio-applied-promo");
    if (savedPromo) {
      setPromoInput(savedPromo);
      const checkSavedPromo = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("promo_codes")
            .select("*")
            .eq("code", savedPromo)
            .eq("active", true)
            .single();

          if (data && !error && subtotal >= Number(data.min_order_value)) {
            if (!data.expires_at || new Date(data.expires_at) > new Date()) {
              setAppliedPromo(data.code);
              let calculatedDiscount = 0;
              if (data.discount_type === "percentage") {
                calculatedDiscount = subtotal * (Number(data.amount) / 100);
              } else {
                calculatedDiscount = Number(data.amount);
              }
              setPromoDiscount(calculatedDiscount);
            }
          }
        } catch (err) {
          console.error("Failed to auto-apply saved promo on checkout mount", err);
        }
      };
      checkSavedPromo();
    }
  }, [subtotal]);

  // Dynamically load Google Maps Autocomplete script
  useEffect(() => {
    const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
    if (!mapsKey) return;

    const scriptId = "google-maps-places-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const handleScriptLoad = () => {
      setMapsLoaded(true);
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = handleScriptLoad;
      document.head.appendChild(script);
    } else {
      if ((window as any).google) {
        setMapsLoaded(true);
      } else {
        script.addEventListener("load", handleScriptLoad);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener("load", handleScriptLoad);
      }
    };
  }, []);

  // Initialize Autocomplete once script is loaded, and delivery input is visible
  useEffect(() => {
    if (!mapsLoaded || orderMode !== "delivery") return;

    // Small delay to ensure the address-input element is fully painted/rendered in the DOM
    const timer = setTimeout(() => {
      const input = document.getElementById("address-input") as HTMLInputElement;
      if (!input || !(window as any).google) return;

      const autocomplete = new (window as any).google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "gb" },
        // Request address_components so we can extract the postcode
        fields: ["formatted_address", "address_components", "place_id"],
      });

      // Prevent checkout form submission if user presses Enter within the address search field
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
        }
      };
      input.addEventListener("keydown", handleKeyDown);

      const listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.formatted_address) return;

        // Extract postcode from address components
        let postcode = "";
        if (place.address_components) {
          const pcComponent = (place.address_components as any[]).find(
            (c: any) => c.types.includes("postal_code")
          );
          if (pcComponent) postcode = pcComponent.long_name;
        }

        // Validate postcode is within the delivery boundary
        if (postcode) {
          const { isPostcodeInDeliveryRange } = require("@/lib/postcode");
          if (!isPostcodeInDeliveryRange(postcode)) {
            // Out of range — clear the field and warn the customer
            setDeliveryAddress("");
            input.value = "";
            toast.error(`Sorry, we don't deliver to ${postcode}. We currently deliver to East London only.`, {
              duration: 5000,
            });
            return;
          }
        }

        setDeliveryAddress(place.formatted_address);
        if (place.place_id) {
          localStorage.setItem("kitchio-place-id", place.place_id);
        }
      });


      return () => {
        if ((window as any).google && listener) {
          (window as any).google.maps.event.removeListener(listener);
        }
        input.removeEventListener("keydown", handleKeyDown);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [mapsLoaded, orderMode]);


  // Redirect if cart empty (skip if we are intentionally redirecting to order tracking)
  useEffect(() => {
    if (items.length === 0 && authChecked && !isRedirectingToOrder) {
      router.push("/");
    }
  }, [items.length, authChecked, router, isRedirectingToOrder]);

  const handleApplyPromo = async () => {
    setPromoError("");
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      setPromoDiscount(0);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (error || !data) {
        setPromoError("Invalid promo code");
        toast.error("Invalid promo code");
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      // Check min order value
      if (subtotal < Number(data.min_order_value)) {
        const err = `Minimum order of £${Number(data.min_order_value).toFixed(2)} required`;
        setPromoError(err);
        toast.error(err);
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError("Promo code has expired");
        toast.error("Promo code has expired");
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      setAppliedPromo(data.code);
      let calculatedDiscount = 0;
      if (data.discount_type === "percentage") {
        calculatedDiscount = subtotal * (Number(data.amount) / 100);
      } else {
        calculatedDiscount = Number(data.amount);
      }
      setPromoDiscount(calculatedDiscount);
      toast.success(`Promo code applied: -£${calculatedDiscount.toFixed(2)}!`);
    } catch (err) {
      setPromoError("Failed to apply promo code");
    }
  };


  const handleCheckout = async (isExpress: boolean = false) => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Please fill in your name and phone number");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (orderMode === "delivery" && !deliveryAddress.trim()) {
      setError("Please search and select your delivery address");
      return;
    }
    if (!minimumMet) {
      setError(`Minimum order of £${restaurant.minimumOrder.toFixed(2)} not met`);
      return;
    }
    if (!isExpress && (!stripe || !elements)) {
      setError("Payment client is still loading. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    // Append scheduled time to special instructions if schedule time selected
    const finalInstructions = [
      specialInstructions,
      deliveryTimeMode === "schedule" ? `[Scheduled Delivery Time: ${selectedTimeSlot}]` : null
    ].filter(Boolean).join(" ");

    try {
      // 1. Create the order in Supabase
      const { order, error: orderError } = await createOrder({
        restaurantId: restaurant.id,
        items,
        subtotal,
        deliveryFee,
        tip: tipAmount,
        total,
        deliveryMode: orderMode,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: orderMode === "delivery" ? deliveryAddress.trim() : null,
        specialInstructions: finalInstructions,
        stripePaymentIntent: isExpress ? `mock_express_${Date.now()}` : null,
      });

      if (orderError || !order) {
        setError(orderError || "Failed to create order");
        setLoading(false);
        return;
      }

      if (isExpress) {
        setIsRedirectingToOrder(true);
        clearCart();
        window.location.href = `/orders/${order.id}`;
        return;
      }

      // 2. Initialize payment intent
      const { clientSecret, error: intentError } = await createPaymentIntent({
        orderId: order.id,
        total,
        stripeAccountId: restaurant.stripeAccountId,
      });

      if (intentError || !clientSecret) {
        setError(intentError || "Failed to initialize payment");
        setLoading(false);
        return;
      }

      // 3. Confirm card payment client-side
      if (!stripe || !elements) {
        setError("Payment client is still loading. Please try again.");
        setLoading(false);
        return;
      }
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError("Payment fields are not ready.");
        setLoading(false);
        return;
      }

      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customerName.trim(),
              phone: customerPhone.trim(),
              email: customerEmail.trim() || undefined,
            },
          },
          return_url: `${window.location.origin}/checkout/success?order_id=${order.id}`,
        }
      );

      if (confirmError) {
        setError(confirmError.message || "Payment declined");
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Finalize order status on the server
        try {
          const { finalizeStripeOrderPayment } = await import("@/lib/actions/orders");
          await finalizeStripeOrderPayment(order.id, paymentIntent.id);
        } catch (finalizeErr) {
          console.error("Failed to finalize order payment status on server:", finalizeErr);
        }
        setIsRedirectingToOrder(true);
        clearCart();
        window.location.href = `/orders/${order.id}`;
      } else {
        setError("Payment authentication failed. Status: " + paymentIntent?.status);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Premium Header */}
      <div className="border-b border-brand-border bg-brand-card px-4 py-4.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-text-muted hover:text-brand-text transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to menu
          </Link>
          <h1 className="font-serif text-2xl font-bold text-brand-text leading-none tracking-tight">
            Secure Checkout
          </h1>
          <div className="w-20 lg:block hidden"></div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
          
          {/* LEFT COLUMN: Customer details & Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Customer Details (Compact, minimal visual layout with zero harsh borders) */}
            <div className="rounded-2xl border border-brand-border bg-brand-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-brand-text-muted">Customer Details</h2>
                  {!isLoggedIn && (
                    <Link
                      href="/login"
                      className="text-xs font-bold text-[#0F8A5F] hover:underline"
                    >
                      Already have an account? Sign in
                    </Link>
                  )}
                </div>
                <p className="text-[11px] text-brand-text-muted mt-1">
                  {isLoggedIn
                    ? `Hi ${customerName.split(" ")[0] || "there"}, we've prefilled your details for a faster checkout experience.`
                    : "Checking out as a guest. Enter your details below."}
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-brand-text-muted">Name *</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Safwan Salehin"
                      className="w-full rounded-xl border border-brand-border bg-brand-bg py-2.5 pl-9 pr-4 text-sm text-brand-text focus:border-[#0F8A5F] focus:ring-1 focus:ring-[#0F8A5F] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-brand-text-muted">Email *</label>
                    <div className="relative">
                      {isLoggedIn ? (
                        <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-text-muted pointer-events-none" />
                      ) : (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted pointer-events-none text-xs font-bold font-sans">@</span>
                      )}
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        disabled={isLoggedIn}
                        placeholder="you@example.com"
                        className={`w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm focus:outline-none transition-colors ${
                          isLoggedIn
                            ? "border-brand-border bg-brand-bg/50 text-brand-text-muted cursor-not-allowed"
                            : "border-brand-border bg-brand-bg text-brand-text focus:border-[#0F8A5F] focus:ring-1 focus:ring-[#0F8A5F]"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-brand-text-muted">Phone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-text-muted pointer-events-none" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="07123 456789"
                        className="w-full rounded-xl border border-brand-border bg-brand-bg py-2.5 pl-9 pr-4 text-sm text-brand-text focus:border-[#0F8A5F] focus:ring-1 focus:ring-[#0F8A5F] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Delivery Details (Pristine layout with zero harsh borders) */}
            {orderMode === "delivery" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Delivery Address</h2>
                <div className="space-y-4">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="address-input"
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Type your address or postcode to autocomplete..."
                      className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm text-gray-900 focus:border-[#0F8A5F] focus:ring-1 focus:ring-[#0F8A5F] focus:outline-none transition-colors"
                      autoComplete="one-time-code"
                    />
                  </div>

                  {/* Saved Locations Bento Quick Selector */}
                  {savedAddresses.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Quick Select Saved Location:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {savedAddresses.map((addr) => {
                          const active = deliveryAddress === addr.address;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setDeliveryAddress(addr.address);
                                toast.success(`Selected saved location "${addr.name}"`);
                              }}
                              className={`py-1.5 px-3 text-xs font-semibold rounded-lg border text-center transition-all duration-100 cursor-pointer ${
                                active
                                  ? "bg-[#0F8A5F] border-[#0F8A5F] text-white font-bold"
                                  : "bg-[#FAFAFA] border-gray-250 text-gray-700 hover:border-gray-350"
                              }`}
                            >
                              {addr.name === "Home" ? "🏠" : addr.name === "Work" ? "💼" : "📍"} {addr.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {deliveryAddress ? (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Delivery fee:</span>
                        <span className="font-bold text-gray-950">£{deliveryFee.toFixed(2)}</span>
                      </div>
                      <span className="text-[11px] font-bold text-green-700">✓ Delivery available</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-600 font-medium">
                      ⚠️ Please enter an address above to calculate delivery options.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 3. When do you want your order? ASAP vs Interactive Schedule Picker */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">When do you want your order?</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* ASAP Card */}
                  <button
                    type="button"
                    onClick={() => setDeliveryTimeMode("asap")}
                    className={`flex items-center justify-center gap-2.5 rounded-xl border py-3 px-4 transition-all duration-150 ${
                      deliveryTimeMode === "asap"
                        ? "border-[#0F8A5F] bg-[#0F8A5F]/5 ring-1 ring-[#0F8A5F] font-bold"
                        : "border-gray-200 hover:border-gray-300 font-medium bg-white"
                    }`}
                  >
                    <Zap className={`h-4.5 w-4.5 ${deliveryTimeMode === "asap" ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`} />
                    <span className="text-xs text-gray-950">ASAP (45 mins)</span>
                  </button>

                  {/* Schedule Card */}
                  <button
                    type="button"
                    onClick={() => setDeliveryTimeMode("schedule")}
                    className={`flex items-center justify-center gap-2.5 rounded-xl border py-3 px-4 transition-all duration-150 ${
                      deliveryTimeMode === "schedule"
                        ? "border-[#0F8A5F] bg-[#0F8A5F]/5 ring-1 ring-[#0F8A5F] font-bold"
                        : "border-gray-200 hover:border-gray-300 font-medium bg-white"
                    }`}
                  >
                    <Clock className={`h-4.5 w-4.5 ${deliveryTimeMode === "schedule" ? "text-[#0F8A5F]" : "text-gray-400"}`} />
                    <span className="text-xs text-gray-950">Schedule Time</span>
                  </button>
                </div>

                {/* Sliding selector slots for scheduled deliveries */}
                {deliveryTimeMode === "schedule" && (
                  <div className="pt-4 border-t border-gray-100 animate-fade-in">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                      Select delivery slot:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SCHEDULE_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all duration-100 ${
                            selectedTimeSlot === slot
                              ? "bg-[#0F8A5F] border-[#0F8A5F] text-white font-bold"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-350"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tipping Section */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Support the Kitchen Team</h2>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold text-amber-700">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-4 leading-normal">
                100% of tips are distributed directly among our chefs and delivery partners.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2.5">
                  {[10, 15, 20].map((percent) => {
                    const active = tipPercentage === percent;
                    return (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => {
                          setTipPercentage(active ? null : percent);
                        }}
                        className={`flex flex-col items-center justify-center rounded-xl border py-2.5 transition-all duration-150 ${
                          active
                            ? "border-[#0F8A5F] bg-[#0F8A5F]/5 ring-1 ring-[#0F8A5F] font-bold"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <span className="text-xs text-gray-950">{percent}%</span>
                        <span className="text-[9px] text-gray-400 mt-0.5 font-semibold">
                          +£{(subtotal * (percent / 100)).toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                  
                  {/* Custom tip option card trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setTipPercentage(null);
                      setCustomTip(customTip ? "" : "5.00");
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border py-2.5 transition-all duration-150 ${
                      tipPercentage === null && customTip
                        ? "border-[#0F8A5F] bg-[#0F8A5F]/5 ring-1 ring-[#0F8A5F] font-bold"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <span className="text-xs text-gray-950">Custom</span>
                    <span className="text-[9px] text-gray-400 mt-0.5 font-semibold">
                      {customTip ? `£${parseFloat(customTip || "0").toFixed(2)}` : "Enter amount"}
                    </span>
                  </button>
                </div>

                {/* Custom tip input field */}
                {tipPercentage === null && customTip !== "" && (
                  <div className="pt-3.5 border-t border-gray-150 animate-fade-in">
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-sans">£</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customTip}
                        onChange={(e) => setCustomTip(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-200 py-2 pl-7 pr-4 text-xs text-gray-955 focus:border-[#0F8A5F] focus:ring-1 focus:ring-[#0F8A5F] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Payment Method */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Payment Method</h2>
              
              {/* Express Checkout Options */}
              <div className="mb-5 space-y-3">
                {canMakePayment && paymentRequest ? (
                  <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Express Checkout via Wallet
                    </p>
                    <PaymentRequestButtonElement options={{ paymentRequest }} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Apple Pay Express */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!customerName.trim() || !customerPhone.trim()) {
                          setError("Please fill in your name and phone number");
                          toast.error("Please fill in your name and phone number");
                          return;
                        }
                        if (!customerEmail.trim() || !customerEmail.includes("@")) {
                          setError("Please enter a valid email address");
                          toast.error("Please enter a valid email address");
                          return;
                        }
                        if (orderMode === "delivery" && !deliveryAddress.trim()) {
                          setError("Please search and select your delivery address");
                          toast.error("Please search and select your delivery address");
                          return;
                        }
                        if (!minimumMet) {
                          setError(`Minimum order of £${restaurant.minimumOrder.toFixed(2)} not met`);
                          toast.error(`Minimum order of £${restaurant.minimumOrder.toFixed(2)} not met`);
                          return;
                        }
                        toast.success("Apple Pay initialized!", {
                          description: "Processing express checkout...",
                        });
                        setTimeout(() => {
                          handleCheckout(true);
                        }, 1500);
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-xl bg-black text-white hover:bg-zinc-900 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
                    >
                      <svg className="h-5 w-auto" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.4 8.5C12.4 7.2 13.4 6.6 13.5 6.5C12.9 5.6 11.9 5.5 11.6 5.5C10.7 5.4 9.9 6.0 9.4 6.0C8.9 6.0 8.3 5.5 7.6 5.5C6.6 5.5 5.7 6.1 5.2 7.0C4.2 8.8 4.9 11.4 5.9 12.8C6.4 13.5 6.9 14.2 7.6 14.2C8.3 14.1 8.6 13.7 9.5 13.7C10.3 13.7 10.6 14.2 11.3 14.1C12.0 14.1 12.5 13.5 13.0 12.8C13.5 12.0 13.7 11.3 13.8 11.2C13.7 11.2 12.4 10.7 12.4 8.5Z" fill="white"/>
                        <path d="M11.9 4.2C12.3 3.7 12.6 3.0 12.5 2.3C11.9 2.3 11.1 2.7 10.7 3.2C10.3 3.6 10.0 4.3 10.1 5.0C10.8 5.1 11.5 4.6 11.9 4.2Z" fill="white"/>
                      </svg>
                      <span className="font-semibold text-xs ml-1">Pay</span>
                    </button>
 
                    {/* Google Pay Express */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!customerName.trim() || !customerPhone.trim()) {
                          setError("Please fill in your name and phone number");
                          toast.error("Please fill in your name and phone number");
                          return;
                        }
                        if (!customerEmail.trim() || !customerEmail.includes("@")) {
                          setError("Please enter a valid email address");
                          toast.error("Please enter a valid email address");
                          return;
                        }
                        if (orderMode === "delivery" && !deliveryAddress.trim()) {
                          setError("Please search and select your delivery address");
                          toast.error("Please search and select your delivery address");
                          return;
                        }
                        if (!minimumMet) {
                          setError(`Minimum order of £${restaurant.minimumOrder.toFixed(2)} not met`);
                          toast.error(`Minimum order of £${restaurant.minimumOrder.toFixed(2)} not met`);
                          return;
                        }
                        toast.success("Google Pay initialized!", {
                          description: "Processing express checkout...",
                        });
                        setTimeout(() => {
                          handleCheckout(true);
                        }, 1500);
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-xl bg-white text-zinc-950 border border-zinc-200 hover:bg-zinc-50 active:scale-95 transition-all duration-150 shadow-sm font-semibold text-xs cursor-pointer"
                    >
                      <svg className="h-4 w-auto mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.23-.66-.35-1.36-.35-2.09z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      <span>Pay</span>
                    </button>
                  </div>
                )}
 
                <div className="flex items-center my-3">
                  <div className="flex-grow border-t border-zinc-100"></div>
                  <span className="mx-2.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Or Pay with Card</span>
                  <div className="flex-grow border-t border-zinc-100"></div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-[#FAFAFA] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-4.5 w-4.5 text-gray-700" />
                    <span className="text-xs font-bold text-gray-950">Card</span>
                    <span className="text-[9px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      VISA / Mastercard
                    </span>
                  </div>
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[9px] font-bold text-green-700">
                    ✓ Secure
                  </span>
                </div>
                
                {/* Embedded stripe elements container */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 focus-within:border-[#0F8A5F] focus-within:ring-1 focus-within:ring-[#0F8A5F] transition-all duration-150">
                  <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
                
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-gray-400" />
                  <span>Secure, encrypted PCI-compliant payment processing</span>
                </div>
              </div>

              {/* Checkout CTA integrated right underneath card info */}
              <div className="mt-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <p className="text-[10px] text-center text-gray-400 leading-normal px-2">
                  By placing this order, you agree to our <span className="underline cursor-pointer">Terms & Conditions</span>.
                </p>

                {/* Continue button at bottom of the column */}
                <button
                  onClick={() => handleCheckout(false)}
                  disabled={loading || !minimumMet || !stripe || !elements || (orderMode === "delivery" && !deliveryAddress)}
                  className="flex w-full items-center justify-between rounded-xl bg-[#0F8A5F] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#0D7A54] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  <CreditCard className="h-5 w-5" />
                  {loading ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin mx-auto" />
                  ) : (
                    <span>Continue →</span>
                  )}
                  <span className="font-serif">£{total.toFixed(2)}</span>
                </button>

                {/* Trust Signals */}
                <div className="flex flex-col items-center gap-2 mt-4 justify-center border-t border-zinc-100 pt-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    <Lock className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 opacity-50">
                    <svg className="h-4.5 w-auto" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="15" rx="2" fill="#1A1F71"/>
                      <path d="M19 3H16L14 11L12.5 4.5H10.5L12 12H14.5L19 3Z" fill="white"/>
                      <path d="M7.5 3H4L2 12H4.5L5 10H8.5L9 12H11.5L9.5 3H7.5ZM5.5 8L6.5 4.5L7.5 8H5.5Z" fill="white"/>
                    </svg>
                    <svg className="h-4.5 w-auto" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="15" rx="2" fill="#0A0A0A"/>
                      <circle cx="9.5" cy="7.5" r="4.5" fill="#EB001B" opacity="0.9"/>
                      <circle cx="14.5" cy="7.5" r="4.5" fill="#F79E1B" opacity="0.9"/>
                    </svg>
                    <svg className="h-4.5 w-auto" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="15" rx="2" fill="black"/>
                      <path d="M12.4 8.5C12.4 7.2 13.4 6.6 13.5 6.5C12.9 5.6 11.9 5.5 11.6 5.5C10.7 5.4 9.9 6.0 9.4 6.0C8.9 6.0 8.3 5.5 7.6 5.5C6.6 5.5 5.7 6.1 5.2 7.0C4.2 8.8 4.9 11.4 5.9 12.8C6.4 13.5 6.9 14.2 7.6 14.2C8.3 14.1 8.6 13.7 9.5 13.7C10.3 13.7 10.6 14.2 11.3 14.1C12.0 14.1 12.5 13.5 13.0 12.8C13.5 12.0 13.7 11.3 13.8 11.2C13.7 11.2 12.4 10.7 12.4 8.5Z" fill="white"/>
                      <path d="M11.9 4.2C12.3 3.7 12.6 3.0 12.5 2.3C11.9 2.3 11.1 2.7 10.7 3.2C10.3 3.6 10.0 4.3 10.1 5.0C10.8 5.1 11.5 4.6 11.9 4.2Z" fill="white"/>
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: Premium Receipt Summary & Promo Code Panel */}
          <div className="space-y-6">
            
            {/* 1. Order Summary Block */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Summary</h2>
                <span className="text-[11px] text-gray-400 font-bold">({items.length} items)</span>
              </div>

              {/* Itemized List */}
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.cartLineId} className="flex items-start justify-between text-xs">
                    <div className="flex-1 pr-4">
                      <span className="font-bold text-gray-950">{item.quantity}x</span>
                      <span className="text-gray-700 ml-2 font-medium">{item.name}</span>
                      {/* Options */}
                      {item.selectedOptions.map((opt) => (
                        <p key={opt.optionId} className="text-[10px] text-gray-400 ml-6 mt-0.5">
                          + {opt.optionName}
                        </p>
                      ))}
                      {/* Extras */}
                      {item.selectedExtras.map((extra) => (
                        <p key={extra.id} className="text-[10px] text-gray-400 ml-6 mt-0.5">
                          + {extra.name}
                        </p>
                      ))}
                    </div>
                    <span className="font-semibold text-gray-950 font-serif">£{item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Subtotal, Delivery, Discounts, Total */}
              <div className="mt-5 space-y-2.5 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span className="text-gray-950 font-bold font-serif">£{subtotal.toFixed(2)}</span>
                </div>
                {orderMode === "delivery" && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Delivery</span>
                    <span className="font-semibold font-serif">
                      {deliveryFee === 0 ? (
                        <span className="text-[#0F8A5F] font-bold uppercase tracking-wider text-[10px]">Free</span>
                      ) : (
                        `£${deliveryFee.toFixed(2)}`
                      )}
                    </span>
                  </div>
                )}

                {/* Driver Tip */}
                {tipAmount > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Driver Tip</span>
                    <span className="text-gray-950 font-bold font-serif">£{tipAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Promo Code Discount */}
                {appliedPromo && (
                  <div className="flex justify-between text-xs text-green-700 font-bold">
                    <span>Promo Applied ({appliedPromo})</span>
                    <span className="font-serif">-£{promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-[#0F8A5F] font-serif">£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 2. Interactive Promos Panel (Loyalty points completely stripped) */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Promo code</label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="E.g. 20SPECIAL"
                    className="flex-1 rounded-lg border border-gray-200 py-1.5 px-3 text-xs focus:border-[#0F8A5F] focus:ring-1 focus:ring-[#0F8A5F] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <span className="text-[10px] text-red-600 mt-1 block font-semibold">{promoError}</span>
                )}
                {appliedPromo && (
                  <span className="text-[10px] text-green-700 mt-1.5 block font-semibold animate-fade-in">
                    ✓ Promo Applied: Saved £{promoDiscount.toFixed(2)} on this order!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise} options={{ locale: "en-GB" }}>
      <CheckoutForm />
    </Elements>
  );
}
