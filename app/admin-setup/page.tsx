"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { promoteToAdminAction } from "@/lib/actions/admin";
import { Shield, Sparkles, Loader2, ArrowRight, UserCheck, KeyRound, Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    async function checkUserSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      // Check if user is already an admin
      const { data: adminProfile } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (adminProfile) {
        setIsAdmin(true);
      }
      setLoading(false);
    }

    checkUserSession();
  }, [supabase]);

  const handlePromotion = async () => {
    if (!user) return;
    if (!enteredCode.trim()) {
      toast.error("Please enter the admin promotion code.");
      return;
    }
    setPromoting(true);
    try {
      console.log("[AdminSetup] Triggering promotion for:", user.id, user.email);
      await promoteToAdminAction(user.id, user.email, enteredCode);
      setIsAdmin(true);
      toast.success("Account elevated to Admin successfully!");
    } catch (err: any) {
      console.error("[AdminSetup] Onboarding promotion failed:", err);
      const errMsg = err.message || "";
      if (
        errMsg.includes("admin_users") &&
        (errMsg.includes("does not exist") || errMsg.includes("schema cache") || errMsg.includes("not find the table"))
      ) {
        toast.error("Database table 'admin_users' is missing! Please copy the SQL from 'supabase/schema.sql' and run it in your Supabase Project SQL Editor first.", {
          duration: 10000,
        });
      } else {
        toast.error(errMsg || "Failed to promote account. Please verify the passcode.");
      }
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-mono">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-2" />
        Analyzing authorization parameters...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative premium radial gradients for modern glassmorphism feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent_40%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-blue-500/5 rounded-full filter blur-[100px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-200 mb-5 shadow-inner">
            <Shield className="h-6 w-6 text-blue-400" />
          </div>
          
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Kitchio Administration</h1>
          <p className="text-xs text-zinc-500 mt-1.5 uppercase font-mono tracking-wider font-semibold">Dev Access Node</p>
          <div className="w-12 h-0.5 bg-zinc-800 my-6" />
        </div>

        {!user ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400 leading-relaxed text-center">
              You are currently signed out. To promote an account to an administrator role, you must first log into the Kitchio shop front.
            </p>
            <Link
              href="/login?next=/admin-setup"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-950 hover:bg-white active:scale-[0.98] transition-all cursor-pointer shadow"
            >
              Sign In to Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : isAdmin ? (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 flex items-start gap-3">
              <UserCheck className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider font-mono">Authorization Verified</p>
                <p className="text-sm text-emerald-350/90 mt-1 leading-relaxed">
                  Your email **{user.email}** is registered as a Kitchio Administrator.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/admin"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-950 hover:bg-white active:scale-[0.98] transition-all cursor-pointer shadow"
              >
                Access Admin Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2"
              >
                Back to Shop Front
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handlePromotion(); }} className="space-y-6">
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
              <p className="text-xs text-zinc-500 uppercase font-mono font-bold tracking-wider">Active Session</p>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-350 truncate">{user.user_metadata?.full_name || "Guest Customer"}</span>
                <span className="text-xs text-zinc-500 truncate">{user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                Administrative Passcode
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showCode ? "text" : "password"}
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder="Enter secure passcode..."
                  className="block w-full pl-10 pr-10 py-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm leading-relaxed"
                  disabled={promoting}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Enter the unique gatekeeper code to elevate your account to a gourmet Kitchio Administrator.
              </p>
            </div>

            <button
              type="submit"
              disabled={promoting || !enteredCode.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {promoting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Elevating Credentials...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  Promote Account to Admin
                </>
              )}
            </button>

            <Link
              href="/"
              className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel and Return Home
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
