import { createClient } from "@supabase/supabase-js";

/**
 * Sends a real SMS via Twilio if configured, otherwise simulates a gorgeous delivery log.
 */
export async function sendOrderStatusSMS(orderId: string, status: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[SMS Pipeline] Supabase credentials missing. Simulation skipped.");
    return false;
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("customer_name, customer_phone, delivery_mode")
      .eq("id", orderId)
      .single();

    if (error || !order || !order.customer_phone) {
      console.warn("[SMS Pipeline] Order phone details missing. Notification skipped.");
      return false;
    }

    const customerName = order.customer_name || "Valued Customer";
    const phone = order.customer_phone;
    const mode = order.delivery_mode || "delivery";

    // Format contextual text based on status transition
    let message = "";
    switch (status) {
      case "accepted":
        message = `Hi ${customerName}, your Kitchio order has been accepted and is now in the queue! 🍕`;
        break;
      case "preparing":
        message = `Hi ${customerName}, our chefs are now cooking your gourmet Kitchio order! 🍳`;
        break;
      case "courier_arrived":
        message = `Hi ${customerName}, your courier has arrived at the kitchen and is collecting your hot food! 🛵`;
        break;
      case "out_for_delivery":
        message = `Hi ${customerName}, your Kitchio ${mode === "delivery" ? "order is out for delivery and is heading your way!" : "selection is ready for collection!"} 🛵`;
        break;
      case "delivered":
        message = `Hi ${customerName}, your order has been successfully ${mode === "delivery" ? "delivered" : "collected"}! Enjoy your gourmet meal! 🌟 Thank you for ordering with Kitchio.`;
        break;
      case "cancelled":
        message = `Hi ${customerName}, we regret to inform you that your Kitchio order has been cancelled and refunded. 💔`;
        break;
      default:
        message = `Hi ${customerName}, your Kitchio order status has been updated to: ${status}.`;
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuthToken && twilioFrom) {
      // Real Twilio API integration via native fetch to avoid external package bundler warnings
      const e164Phone = phone.startsWith("+") ? phone : `+44${phone.replace(/^0/, "")}`;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      
      const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: e164Phone,
          From: twilioFrom,
          Body: message,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twilio REST API error: ${response.status} ${errorText}`);
      }

      const resData = await response.json();
      console.log(`[SMS Pipeline] REAL Twilio SMS dispatched successfully to ${phone} for status: ${status} (SID: ${resData.sid})`);
    } else {
      // Elegant simulated fallback
      console.log("==========================================");
      console.log("[SMS SIMULATION PIPELINE DISPATCHED]");
      console.log(`Recipient Name:  ${customerName}`);
      console.log(`Recipient Phone: ${phone}`);
      console.log(`Status Hook:     ${status}`);
      console.log(`Message Content: "${message}"`);
      console.log("==========================================");
    }
    return true;
  } catch (err) {
    console.error("[SMS Pipeline] Message routing failure:", err);
    return false;
  }
}
