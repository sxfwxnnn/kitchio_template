import { Restaurant } from "@/types";
import { Star, Clock, MapPin } from "lucide-react";
import Image from "next/image";

interface HeroProps {
  restaurant: Restaurant;
}

export default function Hero({ restaurant }: HeroProps) {
  return (
    <div>
      {/* Cover Image */}
      <div className="relative h-[240px] md:h-[280px] w-full overflow-hidden bg-brand-bg">
        <Image
          src={restaurant.coverImage}
          alt={`${restaurant.name} cover`}
          fill
          className="object-cover opacity-85"
          priority
          sizes="100vw"
        />
        {/* Premium Dark Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--brand-bg) 0%, rgba(10,10,10,0.4) 60%, transparent 100%)",
          }}
        />

        {/* Content over image */}
        <div className="absolute bottom-0 left-0 right-0 z-10 mx-auto max-w-7xl px-4 pb-5 lg:px-6 animate-fade-in">
          <div className="flex items-end gap-4 translate-y-4">
            {/* Logo circle overlapping style */}
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-brand-card bg-brand-card shadow-lg">
              <Image
                src={restaurant.logo}
                alt={restaurant.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="pb-1 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
              <h1 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">
                {restaurant.name}
              </h1>
              <p className="text-xs text-white/80 font-medium">{restaurant.cuisine}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/90 font-medium">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {restaurant.rating.toFixed(1)}
                </span>
                <span className="opacity-60">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {restaurant.deliveryTime} min
                </span>
                <span className="opacity-60">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {restaurant.address.split(",").slice(-1)[0].trim()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info bar below image */}
      <div className="border-b border-brand-border bg-brand-card shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-sm lg:px-6 text-brand-text-muted font-medium">
          <span>
            Delivery{" "}
            <span className="font-bold text-brand-text">
              £{restaurant.deliveryFee.toFixed(2)}
            </span>{" "}
            ·{" "}
            <span className="font-bold text-green-600 dark:text-green-400">
              Free over £{restaurant.freeDeliveryOver.toFixed(2)}
            </span>
          </span>
          <span className="hidden sm:inline text-brand-border">|</span>
          <span>
            Min order{" "}
            <span className="font-bold text-brand-text">
              £{restaurant.minimumOrder.toFixed(2)}
            </span>
          </span>
          <span className="hidden sm:inline text-brand-border">|</span>
          {restaurant.isOpen ? (
            <span>
              Open until{" "}
              <span className="font-bold text-brand-text">
                {restaurant.closesAt}
              </span>
            </span>
          ) : (
            <span className="font-bold text-red-500 tracking-wider">CLOSED</span>
          )}
        </div>
      </div>
    </div>
  );
}
