"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface AddressModalProps {
  onValid: (address: string) => void;
}

export default function AddressModal({ onValid }: AddressModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically load Google Maps script if not already present
  useEffect(() => {
    const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!mapsKey) {
      console.warn("Google Maps API key is missing. Falling back to manual address entry.");
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
      script.onerror = () => {
        console.error("Failed to load Google Maps script.");
      };
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

  // Fetch autocomplete suggestions as the user types
  useEffect(() => {
    if (!mapsLoaded || !inputValue.trim() || !autocompleteService.current || placeId) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      autocompleteService.current.getPlacePredictions(
        {
          input: inputValue,
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
  }, [inputValue, mapsLoaded, placeId]);

  // Handle outside clicks to close suggestion list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: any) => {
    setInputValue(suggestion.description);
    setPlaceId(suggestion.place_id);
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
  };

  const handleCheckAddress = () => {
    if (!inputValue.trim()) {
      setError("Please enter your delivery address");
      return;
    }

    setChecking(true);
    setError("");

    // Simulate checker delay
    setTimeout(() => {
      try {
        // Save the address and place_id to localStorage
        localStorage.setItem("kitchio-address", inputValue.trim());
        localStorage.setItem("kitchio-place-id", placeId || "manual");
        // Also save as "postcode" to ensure compatibility with existing Cart/order flows
        localStorage.setItem("kitchio-postcode", inputValue.trim());

        toast.success("Delivery address verified!", {
          description: "Let's check out the menu.",
        });

        onValid(inputValue.trim());
      } catch (err) {
        setError("Something went wrong saving your location. Please try again.");
      } finally {
        setChecking(false);
      }
    }, 400);
  };

  const handleCollectionBypass = () => {
    localStorage.setItem("kitchio-address", "Collection");
    localStorage.setItem("kitchio-place-id", "collection");
    localStorage.setItem("kitchio-postcode", "collection");
    toast.info("Collection mode selected");
    onValid("collection");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <div className="w-full max-w-md animate-fade-in" ref={containerRef}>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-8 shadow-2xl relative overflow-hidden">
          
          {/* Subtle top glow line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-primary/45 to-transparent opacity-60" />

          {/* Icon */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 shadow-inner">
            <MapPin className="h-6 w-6 text-brand-primary" />
          </div>

          <h2 className="text-center font-serif text-2xl font-bold text-white tracking-tight">
            Delivery Address
          </h2>
          <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 font-sans">
            Enter your address to see if we deliver to your area
          </p>

          {/* Input & Autocomplete Search */}
          <div className="mt-6 relative">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setPlaceId(""); // Reset placeId if they edit
                  setError("");
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={
                  mapsLoaded
                    ? "Type your address to autocomplete..."
                    : "Enter your full address..."
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-950 py-3.5 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-650 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none transition-all duration-150 shadow-inner font-medium"
                autoFocus
                autoComplete="one-time-code"
              />
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              {inputValue && (
                <button
                  onClick={() => {
                    setInputValue("");
                    setPlaceId("");
                    setSuggestions([]);
                    setError("");
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions list */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-2.5 shadow-2xl animate-fade-in">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-900 transition-colors duration-100 cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-zinc-250">{suggestion.structured_formatting.main_text}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{suggestion.structured_formatting.secondary_text}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="mt-3 text-xs text-red-400 text-center font-bold uppercase tracking-wide bg-red-950/20 py-1.5 px-3 rounded-xl border border-red-900/30">
                {error}
              </p>
            )}

            <button
              onClick={handleCheckAddress}
              disabled={checking || !inputValue.trim()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-bold text-white transition-all hover:bg-brand-primary/95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 hover:shadow-[0_0_15px_rgba(240,90,61,0.25)] shadow-lg cursor-pointer"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                "Confirm Location"
              )}
            </button>
          </div>

          {/* Collection bypass */}
          <button
            onClick={handleCollectionBypass}
            className="mt-5 w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider cursor-pointer"
          >
            Or choose collection instead
          </button>
        </div>
      </div>
    </div>
  );
}
