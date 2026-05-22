"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, Loader2, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const getRedirectTarget = () => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("next") || "/";
    }
    return "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const nextTarget = getRedirectTarget();
      router.push(nextTarget);
      router.refresh();
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setError("");
    const supabase = createClient();
    const nextTarget = getRedirectTarget();
    
    // Configure full callback redirect URI
    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextTarget)}`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-8">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-950 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to menu
        </Link>

        <div className="rounded-2xl border border-zinc-150/45 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <h1 className="text-xl font-bold text-zinc-950 font-serif tracking-tight">Create Account</h1>
          <p className="mt-1 text-xs text-zinc-400 font-medium">
            Sign up to place orders and track deliveries
          </p>

          {/* Social OAuth Buttons */}
          <div className="mt-6 space-y-2.5">
            {/* Apple Sign-In (Sleek Black style) */}
            <button
              onClick={() => handleSocialLogin("apple")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-white hover:bg-zinc-900 active:scale-[0.98] transition-all duration-150 shadow-sm font-semibold text-xs cursor-pointer"
            >
              <svg className="h-4.5 w-auto fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.4 8.5C12.4 7.2 13.4 6.6 13.5 6.5C12.9 5.6 11.9 5.5 11.6 5.5C10.7 5.4 9.9 6.0 9.4 6.0C8.9 6.0 8.3 5.5 7.6 5.5C6.6 5.5 5.7 6.1 5.2 7.0C4.2 8.8 4.9 11.4 5.9 12.8C6.4 13.5 6.9 14.2 7.6 14.2C8.3 14.1 8.6 13.7 9.5 13.7C10.3 13.7 10.6 14.2 11.3 14.1C12.0 14.1 12.5 13.5 13.0 12.8C13.5 12.0 13.7 11.3 13.8 11.2C13.7 11.2 12.4 10.7 12.4 8.5Z"/>
                <path d="M11.9 4.2C12.3 3.7 12.6 3.0 12.5 2.3C11.9 2.3 11.1 2.7 10.7 3.2C10.3 3.6 10.0 4.3 10.1 5.0C10.8 5.1 11.5 4.6 11.9 4.2Z"/>
              </svg>
              <span>Continue with Apple</span>
            </button>

            {/* Google Sign-In (Elegant White style with border) */}
            <button
              onClick={() => handleSocialLogin("google")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 active:scale-[0.98] transition-all duration-150 shadow-sm font-semibold text-xs cursor-pointer"
            >
              <svg className="h-4 w-auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.23-.66-.35-1.36-.35-2.09z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="flex items-center my-5">
            <div className="flex-grow border-t border-zinc-150"></div>
            <span className="mx-3 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Or sign up with email</span>
            <div className="flex-grow border-t border-zinc-150"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-semibold bg-red-50/50 py-1.5 px-3 rounded border border-red-100 text-center leading-normal">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-805 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer shadow-md mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400 font-medium">
            Already have an account?{" "}
            <Link
              href={`/login${typeof window !== "undefined" ? window.location.search : ""}`}
              className="font-bold text-zinc-900 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
          Powered by Kitchio
        </p>
      </div>
    </div>
  );
}
