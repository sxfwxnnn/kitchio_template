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
      <div className="relative h-[240px] md:h-[280px] w-full overflow-hidden bg-gray-100">
        <Image
          src={restaurant.coverImage}
          alt={`${restaurant.name} cover`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
          }}
        />

        {/* Content over image */}
        <div className="absolute bottom-0 left-0 right-0 z-10 mx-auto max-w-7xl px-4 pb-5 lg:px-6">
          <div className="flex items-end gap-4">
            {/* Logo circle */}
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
              <Image
                src={restaurant.logo}
                alt={restaurant.name}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="pb-0.5">
              <h1 className="text-xl font-bold text-white md:text-2xl">
                {restaurant.name}
              </h1>
              <p className="text-sm text-white/75">{restaurant.cuisine}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-sm text-white/85">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {restaurant.rating}
                </span>
                <span className="text-white/30">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {restaurant.deliveryTime} min
                </span>
                <span className="text-white/30">·</span>
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
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 text-sm lg:px-6">
          <span className="text-gray-500">
            Delivery{" "}
            <span className="font-semibold text-gray-900">
              £{restaurant.deliveryFee.toFixed(2)}
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-green-600">
              Free over £{restaurant.freeDeliveryOver.toFixed(2)}
            </span>
          </span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span className="text-gray-500">
            Min order{" "}
            <span className="font-semibold text-gray-900">
              £{restaurant.minimumOrder.toFixed(2)}
            </span>
          </span>
          <span className="hidden sm:inline text-gray-200">|</span>
          {restaurant.isOpen ? (
            <span className="text-gray-500">
              Open until{" "}
              <span className="font-semibold text-gray-900">
                {restaurant.closesAt}
              </span>
            </span>
          ) : (
            <span className="font-semibold text-red-600">CLOSED</span>
          )}
        </div>
      </div>
    </div>
  );
}
