import { Restaurant, MenuCategory } from "@/types";

export interface DemoPreset {
  id: string;
  name: string;
  cuisine: string;
  primaryColor: string;
  logo: string;
  coverImage: string;
  restaurant: Restaurant;
  menu: MenuCategory[];
}

export const demoPresets: Record<string, DemoPreset> = {
  "1": {
    id: "1",
    name: "Kitchio Pizza Co.",
    cuisine: "Artisanal Neapolitan Pizza & Starters",
    primaryColor: "#C5A880", // Champagne Gold
    logo: "/img/pizza-logo.png",
    coverImage: "/img/pizza-cover.png",
    restaurant: {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      slug: "kitchio-pizza",
      name: "Kitchio Pizza Co.",
      logo: "/img/pizza-logo.png",
      coverImage: "/img/pizza-cover.png",
      primaryColor: "#C5A880",
      cuisine: "Artisanal Neapolitan Pizza & Starters",
      rating: 4.9,
      deliveryTime: "25-35",
      minimumOrder: 15.00,
      deliveryFee: 3.00,
      freeDeliveryOver: 30.00,
      address: "123 Brick Lane, London E1 6QL",
      postcode: "E1 6QL",
      isOpen: true,
      closesAt: "22:00",
      stripeAccountId: "acct_123456"
    },
    menu: [] // Will default to the database pizza menu if empty
  },
  "2": {
    id: "2",
    name: "Crunchy Fried Chicken",
    cuisine: "Crispy Southern Fried Chicken & Sides",
    primaryColor: "#E11D48", // Rich Ruby Red
    logo: "/img/demo/chicken_logo.png",
    coverImage: "/img/demo/chicken_cover.png",
    restaurant: {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      slug: "crunchy-chicken",
      name: "Crunchy Fried Chicken",
      logo: "/img/demo/chicken_logo.png",
      coverImage: "/img/demo/chicken_cover.png",
      primaryColor: "#E11D48",
      cuisine: "Crispy Southern Fried Chicken & Sides",
      rating: 4.7,
      deliveryTime: "20-30",
      minimumOrder: 12.00,
      deliveryFee: 2.50,
      freeDeliveryOver: 25.00,
      address: "45 Commercial St, London E1 6BD",
      postcode: "E1 6BD",
      isOpen: true,
      closesAt: "23:00",
      stripeAccountId: "acct_chicken"
    },
    menu: [
      {
        id: "chicken-cat-1",
        name: "Wings & Tenders",
        items: [
          {
            id: "chicken-item-1",
            name: "6pc Hot Buffalo Wings",
            description: "Spicy cayenne-glazed wings served with a cool ranch dipping cup.",
            price: 6.49,
            image: "/img/demo/chicken_wings.png",
            available: true,
            isPopular: true,
            allergens: ["Gluten", "Dairy"],
            calories: 450,
            extras: []
          },
          {
            id: "chicken-item-2",
            name: "4pc Crispy Golden Tenders",
            description: "Hand-breaded premium tenderloin strips with hickory BBQ dip.",
            price: 5.99,
            image: "/img/demo/chicken_wings.png",
            available: true,
            isPopular: false,
            allergens: ["Gluten"],
            calories: 380,
            extras: []
          }
        ]
      },
      {
        id: "chicken-cat-2",
        name: "Gourmet Burgers",
        items: [
          {
            id: "chicken-item-3",
            name: "Classic Chicken Burger",
            description: "Crispy chicken breast, cool mayo, crunchy shredded lettuce on a toasted bun.",
            price: 6.99,
            image: "/img/demo/chicken_burger.png",
            available: true,
            isPopular: true,
            allergens: ["Gluten", "Dairy"],
            calories: 550,
            extras: []
          }
        ]
      },
      {
        id: "chicken-cat-3",
        name: "Chips & Sides",
        items: [
          {
            id: "chicken-item-4",
            name: "Crispy French Fries",
            description: "Perfectly salted, golden potato fries.",
            price: 2.99,
            image: "/img/menu/garlic-bread.jpg",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 280,
            extras: []
          },
          {
            id: "chicken-item-5",
            name: "Coleslaw Cup",
            description: "Freshly shredded cabbage and carrots in a signature creamy dressing.",
            price: 1.99,
            image: "/img/menu/tiramisu.jpg",
            available: true,
            isPopular: false,
            allergens: ["Dairy"],
            calories: 120,
            extras: []
          }
        ]
      },
      {
        id: "chicken-cat-4",
        name: "Drinks",
        items: [
          {
            id: "chicken-item-6",
            name: "Coca-Cola Can",
            description: "330ml original chilled beverage.",
            price: 1.50,
            image: "/img/menu/cola.jpg",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 139,
            extras: []
          }
        ]
      }
    ]
  },
  "3": {
    id: "3",
    name: "Kitchio Pharmacy",
    cuisine: "Prescriptions, Wellness & First Aid",
    primaryColor: "#0D9488", // Medical Deep Teal
    logo: "/img/demo/pharmacy_logo.png",
    coverImage: "/img/demo/pharmacy_cover.png",
    restaurant: {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      slug: "kitchio-pharmacy",
      name: "Kitchio Pharmacy",
      logo: "/img/demo/pharmacy_logo.png",
      coverImage: "/img/demo/pharmacy_cover.png",
      primaryColor: "#0D9488",
      cuisine: "Prescriptions, Wellness & First Aid",
      rating: 4.8,
      deliveryTime: "15-25",
      minimumOrder: 10.00,
      deliveryFee: 1.99,
      freeDeliveryOver: 20.00,
      address: "12 Whitechapel Rd, London E1 1EW",
      postcode: "E1 1EW",
      isOpen: true,
      closesAt: "20:00",
      stripeAccountId: "acct_pharmacy"
    },
    menu: [
      {
        id: "pharm-cat-1",
        name: "Pain Relief",
        items: [
          {
            id: "pharm-item-1",
            name: "Paracetamol 500mg (16 Tablets)",
            description: "Effective fast-acting relief for headaches, fever, and minor body aches.",
            price: 1.99,
            image: "/img/demo/medical_pills.png",
            available: true,
            isPopular: true,
            allergens: [],
            calories: 0,
            extras: []
          },
          {
            id: "pharm-item-2",
            name: "Ibuprofen 200mg (16 Tablets)",
            description: "Anti-inflammatory pain relief tablets for joint and muscular aches.",
            price: 2.49,
            image: "/img/demo/medical_pills.png",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 0,
            extras: []
          }
        ]
      },
      {
        id: "pharm-cat-2",
        name: "Cold & Flu",
        items: [
          {
            id: "pharm-item-3",
            name: "Soothe Cough Syrup 150ml",
            description: "Non-drowsy cough mixture for dry and tickly throat relief.",
            price: 4.99,
            image: "/img/demo/cough_syrup.png",
            available: true,
            isPopular: true,
            allergens: [],
            calories: 0,
            extras: []
          },
          {
            id: "pharm-item-4",
            name: "Fast Nasal Spray 15ml",
            description: "Instant relief for blocked nasal passages and sinus congestion.",
            price: 3.99,
            image: "/img/demo/cough_syrup.png",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 0,
            extras: []
          }
        ]
      },
      {
        id: "pharm-cat-3",
        name: "First Aid & Wellness",
        items: [
          {
            id: "pharm-item-5",
            name: "Waterproof Plasters (Pack of 20)",
            description: "Assorted breathable and flexible waterproof plasters for small cuts.",
            price: 1.99,
            image: "/img/demo/medical_pills.png",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 0,
            extras: []
          },
          {
            id: "pharm-item-6",
            name: "Vitamin C 1000mg Effervescent (20s)",
            description: "Chilled orange-flavored immune support defense fizz tablets.",
            price: 5.99,
            image: "/img/menu/cola.jpg",
            available: true,
            isPopular: true,
            allergens: [],
            calories: 5,
            extras: []
          }
        ]
      }
    ]
  },
  "4": {
    id: "4",
    name: "Kitchio Retail Express",
    cuisine: "Daily Essentials & Smart Electronics",
    primaryColor: "#2563EB", // Royal Blue
    logo: "/img/demo/retail_logo.png",
    coverImage: "/img/demo/retail_cover.png",
    restaurant: {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      slug: "kitchio-retail",
      name: "Kitchio Retail Express",
      logo: "/img/demo/retail_logo.png",
      coverImage: "/img/demo/retail_cover.png",
      primaryColor: "#2563EB",
      cuisine: "Daily Essentials & Smart Electronics",
      rating: 4.6,
      deliveryTime: "30-45",
      minimumOrder: 15.00,
      deliveryFee: 3.99,
      freeDeliveryOver: 40.00,
      address: "88 Shoreditch High St, London E1 6JJ",
      postcode: "E1 6JJ",
      isOpen: true,
      closesAt: "21:00",
      stripeAccountId: "acct_retail"
    },
    menu: [
      {
        id: "retail-cat-1",
        name: "Smart Electronics",
        items: [
          {
            id: "retail-item-1",
            name: "Wireless Bluetooth Earbuds",
            description: "High-definition sound earbuds with intelligent noise isolation.",
            price: 29.99,
            image: "/img/demo/wireless_earbuds.png",
            available: true,
            isPopular: true,
            allergens: [],
            calories: 0,
            extras: []
          },
          {
            id: "retail-item-2",
            name: "Premium Power Bank 10,000mAh",
            description: "Pocket-sized fast charging backup battery for all USB devices.",
            price: 19.99,
            image: "/img/demo/wireless_earbuds.png",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 0,
            extras: []
          }
        ]
      },
      {
        id: "retail-cat-2",
        name: "Home Essentials",
        items: [
          {
            id: "retail-item-3",
            name: "Ceramic Coffee Mug (Stone Grey)",
            description: "Hand-glazed modern ceramic mug, holds up to 350ml of warm drinks.",
            price: 6.99,
            image: "/img/demo/retail_cover.png",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 0,
            extras: []
          },
          {
            id: "retail-item-4",
            name: "Scented Soy Candle (Lavender)",
            description: "Relaxing, pure soy wax aromatherapy therapeutic candle in glass jar.",
            price: 8.99,
            image: "/img/demo/scented_candle.png",
            available: true,
            isPopular: true,
            allergens: [],
            calories: 0,
            extras: []
          }
        ]
      },
      {
        id: "retail-cat-3",
        name: "Premium Snacks & Drinks",
        items: [
          {
            id: "retail-item-5",
            name: "Dark Chocolate Sea Salt Bar (100g)",
            description: "70% rich organic cocoa bar with hand-harvested Anglesey sea salt.",
            price: 3.49,
            image: "/img/menu/tiramisu.jpg",
            available: true,
            isPopular: true,
            allergens: ["Dairy"],
            calories: 520,
            extras: []
          },
          {
            id: "retail-item-6",
            name: "Original Sparkling Cola Can",
            description: "Refreshing classic chilled beverage.",
            price: 1.50,
            image: "/img/menu/cola.jpg",
            available: true,
            isPopular: false,
            allergens: [],
            calories: 139,
            extras: []
          }
        ]
      }
    ]
  }
};
