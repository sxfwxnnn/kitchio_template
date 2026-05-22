import { AlertTriangle } from "lucide-react";

export default function ClosedBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-100">
      <div className="mx-auto max-w-7xl px-4 py-2.5 lg:px-6 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          We&apos;re currently closed. You can browse the menu but cannot place
          orders right now.
        </p>
      </div>
    </div>
  );
}
