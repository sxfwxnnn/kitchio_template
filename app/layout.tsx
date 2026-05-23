import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { tenantConfig } from "@/config/tenant";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `${tenantConfig.restaurantName} | Order Online — Kitchio`,
  description:
    `Order food online from ${tenantConfig.restaurantName}. ${tenantConfig.cuisine}. Delivery & collection available.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://xukvcpmmlfltwwnnqifj.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://xukvcpmmlfltwwnnqifj.supabase.co" />
        <link rel="preconnect" href="https://maps.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://api.stripe.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --brand-primary: ${tenantConfig.primaryColor};
              }
              .dark {
                --brand-primary: ${tenantConfig.primaryColor};
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-brand-bg text-brand-text transition-colors duration-150" suppressHydrationWarning>
        <CartProvider>{children}</CartProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

