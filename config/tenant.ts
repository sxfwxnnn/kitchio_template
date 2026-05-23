export interface TenantConfig {
  restaurantName: string;
  cuisine: string;
  primaryColor: string; // Hex: Default #F05A3D
  bgColor: string;      // Hex: Default #0A0A0A
  logoUrl: string;
  coverImage: string;
  address: string;
  postcode: string;
  hours: string;
  rating: number;
  deliveryTime: string;
  minimumOrder: number;
  deliveryFee: number;
  freeDeliveryOver: number;
  discountPercentage: number;
}

export const tenantConfig: TenantConfig = {
  restaurantName: "Kitchio",
  cuisine: "Modern Tech Kitchen & Gourmet Delivery",
  primaryColor: "#FF5C1A", // Kitchio Premium Coral Orange
  bgColor: "#FFFFFF",      // Default Light Background (supports dark mode toggle)
  logoUrl: "/img/logo.png", // Premium fallback brand assets
  coverImage: "/img/cover.jpg",
  address: "123 Brick Lane, London E1 6QL",
  postcode: "E1 6QL",
  hours: "11:00 - 23:00",
  rating: 4.9,
  deliveryTime: "20-35",
  minimumOrder: 15.0,
  deliveryFee: 3.0,
  freeDeliveryOver: 30.0,
  discountPercentage: 20,
};
