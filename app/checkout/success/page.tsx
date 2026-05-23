"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, MapPin, Loader2 } from "lucide-react";

function SuccessDetails() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const [secondsLeft, setSecondsLeft] = useState(3);

  // Clear cart on success
  useEffect(() => {
    try {
      localStorage.removeItem("kitchio-cart");
      localStorage.removeItem("kitchio-special-instructions");
    } catch {
      // Ignore
    }
  }, []);

  // Automatic instant redirect
  useEffect(() => {
    if (orderId) {
      window.location.href = `/orders/${orderId}`;
    }
  }, [orderId]);

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Order confirmed!</h1>
      <p className="mt-2 text-sm text-gray-500">
        Your order has been placed successfully. You&apos;ll receive a
        confirmation shortly.
      </p>

      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5">
        <p className="text-sm text-gray-500">Estimated delivery</p>
        <p className="mt-1 text-lg font-bold text-gray-900">25-40 minutes</p>
      </div>

      {orderId && (
        <div className="mt-4 py-2 px-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-green-600 shrink-0" />
          <span className="text-xs font-medium text-gray-550">
            Auto-tracking loading in <span className="font-bold text-gray-800">{secondsLeft}s</span>...
          </span>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <MapPin className="h-4 w-4" />
            Track your order
          </Link>
        )}

        <Link
          href="/"
          className={`flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-colors cursor-pointer ${
            orderId
              ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          Back to menu
        </Link>
      </div>

      <p className="mt-6 text-[10px] text-gray-400">Powered by Kitchio</p>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Suspense
        fallback={
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          </div>
        }
      >
        <SuccessDetails />
      </Suspense>
    </div>
  );
}
