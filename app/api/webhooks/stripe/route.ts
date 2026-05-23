import { NextRequest, NextResponse } from "next/server";

// TODO PROMPT 4: Send order notifications to restaurant dashboard

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};

      // Parse items from chunked metadata keys
      let items: {
        n: string;
        q: number;
        u: number;
        t: number;
        o?: { g: string; c: string; p: number }[];
        e?: { n: string; p: number }[];
      }[] = [];

      try {
        const chunkCount = Number(metadata.item_chunks || "0");
        for (let i = 0; i < chunkCount; i++) {
          const chunk = metadata[`items_${i}`];
          if (chunk) {
            items = items.concat(JSON.parse(chunk));
          }
        }
      } catch {
        // ignore parse errors
      }

      // Create order in Supabase using service role or anon
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: metadata.restaurant_id,
          user_id: session.client_reference_id || null,
          status: "pending",
          subtotal: Number(metadata.subtotal || 0),
          delivery_fee: Number(metadata.delivery_fee || 0),
          total: Number(metadata.total || 0),
          delivery_mode: metadata.delivery_mode || "delivery",
          customer_name: metadata.customer_name || null,
          customer_phone: metadata.customer_phone || null,
          delivery_address: metadata.delivery_address || null,
          special_instructions: metadata.special_instructions || null,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        return NextResponse.json(
          { error: "Order creation failed" },
          { status: 500 }
        );
      }

      // Insert order items
      if (order && items.length > 0) {
        const orderItems = items.map((item) => ({
          order_id: order.id,
          menu_item_id: null,
          quantity: item.q,
          item_name: item.n,
          selected_options: (item.o || []).map((opt) => ({
            groupId: "",
            groupName: opt.g,
            optionId: "",
            optionName: opt.c,
            price: opt.p,
          })),
          selected_extras: (item.e || []).map((extra) => ({
            id: "",
            name: extra.n,
            price: extra.p,
          })),
          unit_price: item.u,
          total_price: item.t,
        }));

        await supabase.from("order_items").insert(orderItems);
      }
    } else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.order_id;
      if (orderId) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        await supabase
          .from("orders")
          .update({ status: "accepted" })
          .eq("id", orderId);

        // Send order notification to Discord webhook
        try {
          const { sendOrderDiscordWebhook } = await import("@/lib/discord");
          await sendOrderDiscordWebhook(orderId);
        } catch (discordErr) {
          console.error("Failed to trigger Discord webhook:", discordErr);
        }

        // TODO PROMPT 4: Trigger Uber Direct delivery creation when Stripe payment succeeds
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook failed" },
      { status: 400 }
    );
  }
}
