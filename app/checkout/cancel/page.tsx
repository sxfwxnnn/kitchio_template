import Link from "next/link";
import { XCircle } from "lucide-react";

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Payment cancelled</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your payment was cancelled. Your cart items are still saved.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Return to menu
          </Link>
        </div>
      </div>
    </div>
  );
}
