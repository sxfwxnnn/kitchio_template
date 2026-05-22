import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client to bypass RLS for webhook updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Map Uber Direct status payloads directly to our database order_status enum
function mapUberStatusToOrderStatus(uberStatus: string): string | null {
  const status = uberStatus.toLowerCase();
  switch (status) {
    case "created":
      return "pending";
    case "accepted":
      return "accepted";
    case "pickup":
    case "pickup_ready":
      return "preparing";
    case "pickup_complete":
    case "courier_arrived":
    case "arrived":
      return "courier_arrived";
    case "dropoff":
    case "out_for_delivery":
    case "en_route":
      return "out_for_delivery";
    case "delivered":
    case "completed":
      return "delivered";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  // TODO PROMPT 4: Integrate active Uber Direct API keys and payload validation

  try {
    const payload = await req.json();
    console.log("Received Uber Direct Webhook Payload:", JSON.stringify(payload, null, 2));

    // Extract relevant fields from the Uber webhook event payload
    // Normally Uber Direct sends: { event_type, delivery_id, external_id, status, courier, tracking_url, ... }
    const orderId = payload.external_id || payload.delivery_id;
    const uberStatus = payload.status;
    const trackingUrl = payload.tracking_url || payload.tracking_metadata?.share_url;
    const courier = payload.courier;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID (external_id or delivery_id)" }, { status: 400 });
    }

    const mappedStatus = uberStatus ? mapUberStatusToOrderStatus(uberStatus) : null;
    
    // Build update object
    const updateData: any = {};
    if (mappedStatus) {
      updateData.status = mappedStatus;
    }
    if (trackingUrl) {
      updateData.uber_tracking_url = trackingUrl;
    }
    if (courier) {
      updateData.courier_name = courier.name || `${courier.first_name || ""} ${courier.last_name || ""}`.trim();
      updateData.courier_phone = courier.phone || courier.phone_number;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No relevant fields to update received" }, { status: 200 });
    }

    // Update the database order using Supabase admin client to bypass RLS policies
    const { data, error } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error(`Supabase error updating order ${orderId}:`, error);
      return NextResponse.json({ error: "Database update failed", details: error.message }, { status: 500 });
    }

    console.log(`Successfully updated order ${orderId} status to '${mappedStatus}' via Uber Direct Webhook.`);
    // TODO PROMPT 4: Send order notifications to restaurant dashboard
    return NextResponse.json({ success: true, updatedOrder: data }, { status: 200 });

  } catch (err) {
    console.error("Uber Webhook process crashed:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
