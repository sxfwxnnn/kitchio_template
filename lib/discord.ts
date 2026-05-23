import { createClient } from "@supabase/supabase-js";

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1507179124857376798/rHh2ct61tVy8OSJlUhusP6TJeeKse29NNoSANZct1ZtRt1ZhLJ6efhN5n_mV3xXnQjQs";

/**
 * Sends a detailed order notification embed to the Kitchio Discord Webhook.
 * It dynamically calculates:
 * - Store Name (joining the restaurants table)
 * - Amount Paid (total order amount)
 * - Restaurant Cut (88%)
 * - Kitchio Cut (12%)
 * - Kitchio Daily Total (12% of all paid/accepted orders created today in UTC)
 * 
 * Bypasses RLS using the Supabase Service Role key so daily totals are accurately calculated.
 */
export async function sendOrderDiscordWebhook(orderId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Discord Webhook Error: Supabase credentials are not configured properly.");
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch current order with its restaurant name
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, restaurants(name)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`Discord Webhook Error: Failed to fetch order ${orderId}:`, orderError);
      return;
    }

    const storeName = (order.restaurants as any)?.name || "Kitchio Store";
    const amountPaid = Number(order.total || 0);
    const restaurantCut = amountPaid * 0.88;
    const kitchioCut = amountPaid * 0.12;

    // 2. Fetch all accepted/active/completed orders placed today (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    const { data: dailyOrders, error: dailyError } = await supabase
      .from("orders")
      .select("id, total")
      .gte("created_at", todayStartISO)
      .in("status", ["accepted", "preparing", "courier_arrived", "out_for_delivery", "delivered"]);

    if (dailyError) {
      console.error("Discord Webhook Error: Failed to fetch daily orders:", dailyError);
    }

    // Sum all order totals today
    let dailyTotalSum = 0;
    let foundCurrentOrder = false;

    if (dailyOrders) {
      for (const o of dailyOrders) {
        dailyTotalSum += Number(o.total || 0);
        if (o.id === order.id) {
          foundCurrentOrder = true;
        }
      }
    }

    // Fallback security check: if the current order wasn't returned in the query yet (due to race condition or replication lag), add it manually.
    if (!foundCurrentOrder) {
      dailyTotalSum += amountPaid;
    }

    const kitchioDailyTotal = dailyTotalSum * 0.12;

    // 3. Construct the message embed payload
    const embedPayload = {
      username: "Kitchio Order Alerts",
      avatar_url: "https://kitch.io/favicon.ico", // premium placeholder avatar
      embeds: [
        {
          title: "🚀 New Order Received!",
          description: `An order from **${storeName}** has been paid and accepted.`,
          color: 1018104, // Elegant Coral / Emerald style #0F8A5F (1018104 in decimal)
          fields: [
            {
              name: "Store Name",
              value: storeName,
              inline: true
            },
            {
              name: "Amount Paid",
              value: `£${amountPaid.toFixed(2)}`,
              inline: true
            },
            {
              name: "\u200b",
              value: "\u200b",
              inline: false
            },
            {
              name: "Restaurant Cut (88%)",
              value: `£${restaurantCut.toFixed(2)}`,
              inline: true
            },
            {
              name: "Kitchio Cut (12%)",
              value: `£${kitchioCut.toFixed(2)}`,
              inline: true
            },
            {
              name: "Kitchio Daily Total",
              value: `**£${kitchioDailyTotal.toFixed(2)}**`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: `Order ID: #${order.id.substring(0, 8).toUpperCase()}`
          }
        }
      ]
    };

    // 4. POST payload to the Discord Webhook
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(embedPayload)
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Discord Webhook POST failed with status ${response.status}: ${responseText}`);
    } else {
      console.log(`Discord webhook successfully triggered for order: ${orderId}`);
    }
  } catch (err) {
    console.error("Discord Webhook notification error:", err);
  }
}
