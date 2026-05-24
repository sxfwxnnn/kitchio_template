"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, CheckCircle, ArrowRight, Loader2, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectPage() {
  const supabase = createClient();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("restaurant_settings")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("restaurant_slug", "marios-pizza")
          .single();

        if (error) throw error;
        setSettings(data);
      } catch (err: any) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleStripeConnect = async () => {
    setConnecting(true);
    try {
      // Simulate Stripe onboarding redirect and update settings status
      setTimeout(async () => {
        try {
          const { error } = await supabase
            .from("restaurant_settings")
            .upsert({
              restaurant_slug: "marios-pizza",
              stripe_account_id: "acct_1TYZ5bCEwPReeCzc", // Demo platform connected stripe ID
              stripe_onboarding_complete: true,
              updated_at: new Date().toISOString()
            });

          if (error) throw error;

          setSettings({
            stripe_account_id: "acct_1TYZ5bCEwPReeCzc",
            stripe_onboarding_complete: true
          });
          toast.success("✓ Stripe Connect Account onboarded successfully! Payments are now live.");
        } catch (err: any) {
          toast.error("Failed to mock Stripe Connect onboarding: " + err.message);
        } finally {
          setConnecting(false);
        }
      }, 1500);
    } catch (err: any) {
      toast.error("Connection failed.");
      setConnecting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 px-8 flex items-center justify-between shrink-0 bg-zinc-950">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight">Stripe Connect Center</h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            Merchant Gateway Management
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-zinc-500 font-mono text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-2" />
            Querying merchant accounts...
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-zinc-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Ambient gold glow */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF5C1A]/20 to-transparent" />

            <div className="flex items-center gap-4 border-b border-zinc-850 pb-5">
              <div className="h-12 w-12 rounded-2xl bg-zinc-950 border border-zinc-850 flex items-center justify-center text-[#FF5C1A]">
                <CreditCard className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Payout Account Setup</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Route customer payments directly to your business balance</p>
              </div>
            </div>

            {settings?.stripe_onboarding_complete && settings?.stripe_account_id ? (
              /* CONNECTED STATE */
              <div className="space-y-6 animate-fade-in select-none">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400">✓ Payments Active</h3>
                    <p className="text-xs text-emerald-500/80 mt-1 leading-relaxed">
                      Your Stripe Connect account is successfully onboarded. Payments from all channels are being routed straight to your merchant balance.
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-650">ACCOUNT IDENTIFIER:</span>
                    <span className="text-zinc-300 font-semibold">{settings.stripe_account_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-650">INTEGRATION STATUS:</span>
                    <span className="text-emerald-400 font-bold">LIVE & DISPATCHED</span>
                  </div>
                </div>

                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-12 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>View Stripe Dashboard</span>
                  <ExternalLink className="h-4 w-4 stroke-[2.5]" />
                </a>
              </div>
            ) : (
              /* DISCONNECTED STATE */
              <div className="space-y-6 animate-fade-in select-none">
                <div className="bg-[#FF5C1A]/10 border border-[#FF5C1A]/20 rounded-2xl p-5 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#FF5C1A] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-[#FF5C1A]">Onboarding Incomplete</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Your payout bank account is not connected yet. Customers cannot place orders until you complete Stripe onboarding.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStripeConnect}
                  disabled={connecting}
                  className="w-full h-12 rounded-xl bg-[#FF5C1A] hover:bg-[#FF5C1A]/90 text-white font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <span>Connect Bank Account</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
