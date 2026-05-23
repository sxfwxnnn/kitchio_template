"use server";

import { CartItem, OrderMode } from "@/types";

// TODO PROMPT 3: Add promo codes and discounts

export async function createCheckoutSession(params: {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryMode: OrderMode;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  specialInstructions: string;
  restaurantId: string;
  stripeAccountId: string | null;
}): Promise<{ url: string | null; error: string | null }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { url: null, error: "Stripe is not configured" };
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const feePercent = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT || "5");
    const applicationFee = Math.round(params.total * (feePercent / 100) * 100); // in pence

    const lineItems = params.items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          description: [
            ...item.selectedOptions.map((o) => o.optionName),
            ...item.selectedExtras.map((e) => `+ ${e.name}`),
          ]
            .filter(Boolean)
            .join(", ") || undefined,
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }));

    // Add delivery fee as a line item if applicable
    if (params.deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: {
            name: "Delivery fee",
            description: undefined,
          },
          unit_amount: Math.round(params.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Split items across multiple metadata keys to stay under Stripe's 500 char limit
    const compactItems = params.items.map((i) => ({
      n: i.name,
      q: i.quantity,
      u: i.unitPrice,
      t: i.totalPrice,
      o: i.selectedOptions.map((opt) => ({
        g: opt.groupName,
        c: opt.optionName,
        p: opt.price,
      })),
      e: i.selectedExtras.map((extra) => ({
        n: extra.name,
        p: extra.price,
      })),
    }));

    const itemChunks: Record<string, string> = {};
    let currentChunk: typeof compactItems = [];
    let currentChunkIdx = 0;

    for (const item of compactItems) {
      const testChunk = [...currentChunk, item];
      const testJson = JSON.stringify(testChunk);
      if (testJson.length > 490 && currentChunk.length > 0) {
        itemChunks[`items_${currentChunkIdx}`] = JSON.stringify(currentChunk);
        currentChunkIdx++;
        currentChunk = [item];
      } else {
        currentChunk = testChunk;
      }
    }
    if (currentChunk.length > 0) {
      itemChunks[`items_${currentChunkIdx}`] = JSON.stringify(currentChunk);
    }

    const sessionParams: Record<string, unknown> = {
      mode: "payment",
      line_items: lineItems,
      payment_method_types: ["card"],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        restaurant_id: params.restaurantId,
        delivery_mode: params.deliveryMode,
        customer_name: params.customerName,
        customer_phone: params.customerPhone,
        delivery_address: (params.deliveryAddress || "").slice(0, 490),
        special_instructions: (params.specialInstructions || "").slice(0, 490),
        subtotal: String(params.subtotal),
        delivery_fee: String(params.deliveryFee),
        total: String(params.total),
        item_chunks: String(currentChunkIdx + 1),
        ...itemChunks,
      },
    };

    // If restaurant has a Stripe Connect account, use it
    if (params.stripeAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: params.stripeAccountId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    return { url: session.url, error: null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Checkout failed",
    };
  }
}

export async function createPaymentIntent(params: {
  orderId: string;
  total: number;
  stripeAccountId: string | null;
}): Promise<{ clientSecret: string | null; error: string | null }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { clientSecret: null, error: "Stripe is not configured" };
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const feePercent = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT || "5");
    const applicationFee = Math.round(params.total * (feePercent / 100) * 100); // in pence

    const paymentIntentParams: any = {
      amount: Math.round(params.total * 100), // in pence
      currency: "gbp",
      metadata: {
        order_id: params.orderId,
      },
    };

    if (params.stripeAccountId) {
      paymentIntentParams.application_fee_amount = applicationFee;
      paymentIntentParams.transfer_data = {
        destination: params.stripeAccountId,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Update the order in the database to link it to this PaymentIntent
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      await supabase
        .from("orders")
        .update({ stripe_payment_intent: paymentIntent.id })
        .eq("id", params.orderId);
    }

    return { clientSecret: paymentIntent.client_secret, error: null };
  } catch (err) {
    return {
      clientSecret: null,
      error: err instanceof Error ? err.message : "Payment initialization failed",
    };
  }
}
