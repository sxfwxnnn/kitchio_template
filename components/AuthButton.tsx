"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, Package, ChevronDown, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";

export default function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setShowDropdown(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="h-8 w-16 animate-pulse rounded-full bg-gray-100" />
    );
  }

  if (!user) {
    // TODO PROMPT 3: Add social login providers
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initials = (
    user.user_metadata?.full_name ||
    user.email ||
    "U"
  )
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2 py-1 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
          {initials}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-150 ${
            showDropdown ? "rotate-180" : ""
          }`}
        />
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg z-50">
          <div className="border-b border-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.user_metadata?.full_name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/orders"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Package className="h-4 w-4 text-gray-400" />
              My Orders
            </Link>
            <Link
              href="/account"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
