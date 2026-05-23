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
  restaurantName: "Mario's Pizza",
  cuisine: "Artisan Pizza & Gourmet Sides",
  primaryColor: "#0C2C5C", // Default Spice Hut Blue
  bgColor: "#FFFFFF",      // Default Light Background
  logoUrl: "/pizza_logo_1779415768933.png", // absolute public paths
  coverImage: "/pizza_cover_1779415748291.png",
  address: "123 Brick Lane, London E1 6QL",
  postcode: "E1 6QL",
  hours: "17:00 - 22:00",
  rating: 4.9,
  deliveryTime: "20-35",
  minimumOrder: 15.0,
  deliveryFee: 3.0,
  freeDeliveryOver: 30.0,
  discountPercentage: 20,
};
