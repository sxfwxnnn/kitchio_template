"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, User, Phone, MapPin, Loader2, Save, Search, Mail, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AccountSettingsPage() {
  const router = useRouter();
  
  // Auth & Profile state
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form values
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [newAddressLabel, setNewAddressLabel] = useState("Home");
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Security Credentials state
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isResetFlow, setIsResetFlow] = useState(false);

  // Google Places Autocomplete state
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeId, setPlaceId] = useState("");
  
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically load Google Maps script if not already present
  useEffect(() => {
    const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!mapsKey) {
      console.warn("Google Maps API key is missing. Address field will operate manually.");
      return;
    }

    const scriptId = "google-maps-places-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initAutocomplete = () => {
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        setMapsLoaded(true);
        autocompleteService.current = new (window as any).google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement("div");
        placesService.current = new (window as any).google.maps.places.PlacesService(dummyDiv);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      if ((window as any).google && (window as any).google.maps) {
        initAutocomplete();
      } else {
        script.addEventListener("load", initAutocomplete);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener("load", initAutocomplete);
      }
    };
  }, []);

  // Fetch Autocomplete suggestions as address input changes
  useEffect(() => {
    if (!mapsLoaded || !defaultAddress.trim() || !autocompleteService.current || placeId) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      autocompleteService.current.getPlacePredictions(
        {
          input: defaultAddress,
          componentRestrictions: { country: "gb" }, // Restrict to UK
          types: ["address"],
        },
        (predictions: any[], status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [defaultAddress, mapsLoaded, placeId]);

  // Handle outside clicks to close autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load User and Profile data from Supabase
  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      // Check URL parameters to see if user is redirected from a password reset email
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("reset") === "true") {
          setIsResetFlow(true);
          toast.info("Please set a new password below.", { duration: 5000 });
        }
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && profile) {
        setFullName(profile.full_name || user.user_metadata?.full_name || "");
        setPhoneNumber(profile.phone_number || "");
        setDefaultAddress(profile.default_address || "");
        // Block autocomplete Suggestion popups for initial address values
        if (profile.default_address) {
          setPlaceId("loaded");
        }
      } else {
        setFullName(user.user_metadata?.full_name || "");
      }
      
      // Load saved addresses
      try {
        const stored = JSON.parse(localStorage.getItem("kitchio-saved-addresses") || "[]");
        setSavedAddresses(stored);
      } catch {
        // Ignore
      }
      
      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleAddAddress = (name: string, address: string) => {
    if (!address.trim()) return;
    const label = name.trim() || "Home";

    if (savedAddresses.length >= 5) {
      toast.error("You can save up to 5 addresses only.");
      return;
    }

    const newAddr = {
      id: `addr-${Date.now()}`,
      name: label,
      address: address.trim()
    };

    const updated = [...savedAddresses, newAddr];
    setSavedAddresses(updated);
    localStorage.setItem("kitchio-saved-addresses", JSON.stringify(updated));
    toast.success(`Address "${label}" saved!`);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("user_addresses")
          .upsert({ user_id: user.id, name: label, address: address.trim() })
          .then();
      }
    });
  };

  const handleDeleteAddress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAddresses.filter((a) => a.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem("kitchio-saved-addresses", JSON.stringify(updated));
    toast.success("Saved address removed.");
  };

  // Suggestions click handler
  const handleSuggestionSelect = (suggestion: any) => {
    setPlaceId(suggestion.place_id);
    setDefaultAddress(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      default_address: defaultAddress,
    });

    if (error) {
      toast.error("Failed to update profile. Please try again.");
    } else {
      toast.success("Profile settings updated successfully!");
      // Synchronize in localStorage for seamless checkout experience
      try {
        localStorage.setItem("kitchio-address", defaultAddress);
        localStorage.setItem("kitchio-postcode", "verified");
      } catch {
        // Ignore
      }
    }
    setSaving(false);
  };

  // Email update handler
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail.trim() === user?.email) {
      toast.error("Please enter a new email address.");
      return;
    }

    setEmailLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

    setEmailLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email verification links sent!", {
        description: "Please check both your old and new email addresses to confirm the change.",
        duration: 6000,
      });
      setNewEmail("");
    }
  };

  // Password update handler
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      toast.error("Please enter a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setIsResetFlow(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-950 stroke-[1.5]" />
        <p className="mt-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Loading settings...</p>
      </div>
    );
  }

  // Guest Redirect State
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between">
        {/* Header */}
        <header className="border-b border-zinc-100 bg-white sticky top-0 z-10">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Menu</span>
            </Link>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">Kitchio</span>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-md w-full px-4 py-20 flex-1 flex flex-col justify-center text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 border border-zinc-200 shadow-sm">
            <User className="h-6 w-6 text-zinc-400 stroke-[1.5]" />
          </div>
          <h1 className="text-md font-bold text-zinc-950 uppercase tracking-wider">
            Sign In Required
          </h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed font-medium">
            Please sign in to your Kitchio account to customize your profile, phone number, and default delivery address.
          </p>
          <Link
            href="/login?next=/account"
            className="mt-6 inline-block w-full rounded-full bg-zinc-950 py-3 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition-colors shadow-md"
          >
            Sign In
          </Link>
        </main>
        
        {/* Footer */}
        <footer className="py-6 border-t border-zinc-100 bg-white">
          <p className="text-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Powered by Kitchio
          </p>
        </footer>
      </div>
    );
  }

  const isAnonymous = user.is_anonymous || user.email === undefined || user.email === null;

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-zinc-100 bg-white sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Menu</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">Settings</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-2xl w-full px-4 py-8 flex-1 space-y-8">
        
        {/* 1. PROFILE DETAILS CARD */}
        <div className="bg-white rounded-2xl border border-zinc-150 p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="mb-6">
            <h1 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Account Profile</h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">Update your profile parameters for expedited checkout ordering.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field (Non-editable profile review) */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Account Email Address
              </label>
              <div className="flex h-11 w-full items-center rounded-xl bg-zinc-50 border border-zinc-150 px-3.5 text-xs font-semibold text-zinc-400 select-none">
                {isAnonymous ? "Anonymous Guest User" : user.email}
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="E.g. Alexander Mercer"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all duration-150"
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label htmlFor="phoneNumber" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Phone className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  id="phoneNumber"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="E.g. +44 7700 900077"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all duration-150"
                />
              </div>
            </div>

            {/* Address Field with Autocomplete integration */}
            <div ref={containerRef} className="relative">
              <label htmlFor="defaultAddress" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Default Delivery Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  {mapsLoaded ? <Search className="h-4 w-4 text-zinc-400" /> : <MapPin className="h-4 w-4 text-zinc-400" />}
                </div>
                <input
                  id="defaultAddress"
                  type="text"
                  required
                  value={defaultAddress}
                  onChange={(e) => {
                    setPlaceId("");
                    setDefaultAddress(e.target.value);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Search postcode or address..."
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all duration-150"
                  autoComplete="one-time-code"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-zinc-150 bg-white shadow-lg">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-b-0"
                    >
                      <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-700 truncate">
                        {suggestion.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Locations Bento Module */}
            <div className="pt-4 border-t border-zinc-105">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Saved Locations ({savedAddresses.length}/5)
                </span>
                {savedAddresses.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!defaultAddress.trim()) {
                        toast.error("Please enter/search an address in the search box first!");
                        return;
                      }
                      const label = prompt("Enter location label (e.g. Home, Work, Gym):", "Home");
                      if (label !== null) {
                        handleAddAddress(label, defaultAddress);
                      }
                    }}
                    className="text-[10px] font-bold text-brand-primary hover:underline"
                  >
                    + Save Current Address
                  </button>
                )}
              </div>

              {savedAddresses.length === 0 ? (
                <p className="text-[10px] text-zinc-400 font-medium italic">
                  No additional locations saved yet. Enter an address in the field above to save it.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setDefaultAddress(addr.address);
                        setPlaceId("loaded");
                        toast.success(`Active address set to "${addr.name}"`);
                      }}
                      className={`group relative flex flex-col justify-between rounded-xl border p-3 cursor-pointer transition-all duration-150 ${
                        defaultAddress === addr.address
                          ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                          {addr.name === "Home" ? "🏠" : addr.name === "Work" ? "💼" : "📍"} {addr.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAddress(addr.id, e)}
                          className="text-[9px] font-bold text-red-500 opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium truncate w-full pr-4">
                        {addr.address}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 2. SECURITY & AUTHENTICATION CARD (Hidden for anonymous guest users) */}
        {!isAnonymous && (
          <div className="bg-white rounded-2xl border border-zinc-150 p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-8">
            
            {/* Header */}
            <div>
              <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Account Credentials</h2>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Manage your security settings, update your email address, or reset your password.</p>
            </div>

            {/* A. Change Email Form */}
            <div className="pt-6 border-t border-zinc-100">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-zinc-500" />
                Change Email Address
              </h3>
              
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div>
                  <label htmlFor="newEmail" className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    New Email Address
                  </label>
                  <input
                    id="newEmail"
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new-email@example.com"
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-4 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all duration-150"
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailLoading || !newEmail.trim()}
                  className="flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 px-5 py-2.5 text-xs font-bold text-zinc-800 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  {emailLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Update Email Address"
                  )}
                </button>
              </form>
            </div>

            {/* B. Reset / Change Password Form */}
            <div className="pt-6 border-t border-zinc-100">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-zinc-500" />
                Change Password
              </h3>

              {isResetFlow && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-4.5 text-xs text-amber-800 leading-normal font-semibold animate-pulse">
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Forgot Password Recovery Mode</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Please enter and confirm your secure new account password below.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-4 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all duration-150"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-4 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all duration-150"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword.trim()}
                  className="flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 px-5 py-2.5 text-xs font-bold text-zinc-800 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  {passwordLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Update Account Password"
                  )}
                </button>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-100 bg-white">
        <p className="text-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
          Powered by Kitchio
        </p>
      </footer>
    </div>
  );
}
