import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kitchio | Order Online — Gourmet Pizza & Artisan Eats",
  description:
    "Order food online from Kitchio. Gourmet Artisan Pizza & Sides. Delivery & collection available.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kitchio",
  },
};

// TODO PROMPT 4: Add restaurant admin dashboard integration

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-sans antialiased bg-white" suppressHydrationWarning>
        <CartProvider>
          {children}
          <Toaster position="top-center" richColors />
        </CartProvider>
      </body>
    </html>
  );
}

