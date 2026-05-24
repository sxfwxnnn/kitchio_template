import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { tenantConfig } from "@/config/tenant";
import { Toaster } from "sonner";
import { ToastProvider } from "@/components/ToastSystem";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
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
      <body className="font-sans antialiased bg-[#FAFAFA] text-[#1A1A1A] transition-colors duration-150" suppressHydrationWarning>
        <ToastProvider>
          <CartProvider>{children}</CartProvider>
        </ToastProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

