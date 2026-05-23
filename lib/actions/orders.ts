"use server";

import { createClient } from "@/lib/supabase/server";
import { Order, OrderItem, CartItem, OrderMode } from "@/types";

export async function createOrder(params: {
  restaurantId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  tip?: number;
  total: number;
  deliveryMode: OrderMode;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  specialInstructions: string;
  stripePaymentIntent: string | null;
}): Promise<{ order: Order | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertData: any = {
      restaurant_id: params.restaurantId,
      user_id: user?.id || null,
      status: params.stripePaymentIntent?.startsWith("mock_express_") ? "accepted" : "pending",
      subtotal: params.subtotal,
      delivery_fee: params.deliveryFee,
      total: params.total,
      delivery_mode: params.deliveryMode,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      delivery_address: params.deliveryAddress,
      special_instructions: params.specialInstructions,
      stripe_payment_intent: params.stripePaymentIntent,
    };

    if (params.tip !== undefined && params.tip > 0) {
      insertData.tip = params.tip;
    }

    let { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(insertData)
      .select()
      .single();

    if (
      orderError && 
      (orderError.code === "42703" || 
       orderError.message?.includes("tip") || 
       orderError.message?.includes("schema cache"))
    ) {
      // Self-healing fallback: column 'tip' does not exist in public.orders table.
      // Append the tip to special instructions so it's not lost, and retry the insert without 'tip' key.
      const updatedInstructions = [
        params.specialInstructions,
        params.tip !== undefined && params.tip > 0 ? `[Tip: £${params.tip?.toFixed(2)}]` : ""
      ].filter(Boolean).join(" ");

      const fallbackInsert = { ...insertData };
      delete fallbackInsert.tip;
      fallbackInsert.special_instructions = updatedInstructions;

      const retryResult = await supabase
        .from("orders")
        .insert(fallbackInsert)
        .select()
        .single();

      order = retryResult.data;
      orderError = retryResult.error;
    }

    if (orderError || !order) {
      return { order: null, error: orderError?.message || "Failed to create order" };
    }

    // Insert order items
    const orderItems = params.items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.itemId.startsWith("item-") ? null : item.itemId,
      quantity: item.quantity,
      item_name: item.name,
      selected_options: item.selectedOptions,
      selected_extras: item.selectedExtras,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      note: item.note || null,
    }));

    let { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Self-healing fallback: column 'note' does not exist in public.order_items table or schema cache.
      if (
        itemsError.code === "42703" || 
        itemsError.message?.includes("note") || 
        itemsError.message?.includes("schema cache")
      ) {
        const fallbackOrderItems = orderItems.map(({ note, ...rest }) => rest);
        const retryItemsResult = await supabase
          .from("order_items")
          .insert(fallbackOrderItems);
        itemsError = retryItemsResult.error;
      }
    }

    if (itemsError) {
      return { order: null, error: itemsError.message };
    }

    return { order: order as Order, error: null };
  } catch (err) {
    return {
      order: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function finalizeStripeOrderPayment(
  orderId: string,
  paymentIntentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: "Supabase credentials are not configured" };
    }

    const { createClient: createSupabaseJS } = await import("@supabase/supabase-js");
    const supabaseAdmin = createSupabaseJS(supabaseUrl, serviceRoleKey);

    // Update status to accepted and record the payment intent
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update({ status: "accepted", stripe_payment_intent: paymentIntentId })
      .eq("id", orderId)
      .select()
      .single();

    if (error || !order) {
      return { success: false, error: error?.message || "Order not found" };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getGuestOrder(
  orderId: string
): Promise<{ order: (Order & { items: OrderItem[] }) | null; error: string | null }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { order: null, error: "Supabase credentials are not configured" };
    }

    const { createClient: createSupabaseJS } = await import("@supabase/supabase-js");
    const supabaseAdmin = createSupabaseJS(supabaseUrl, serviceRoleKey);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return { order: null, error: error?.message || "Order not found" };
    }

    return {
      order: {
        ...order,
        items: order.order_items || [],
      } as Order & { items: OrderItem[] },
      error: null,
    };
  } catch (err) {
    return {
      order: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getOrder(
  orderId: string
): Promise<{ order: (Order & { items: OrderItem[] }) | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return { order: null, error: error?.message || "Order not found" };
    }

    return {
      order: {
        ...order,
        items: order.order_items || [],
      } as Order & { items: OrderItem[] },
      error: null,
    };
  } catch (err) {
    return {
      order: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getUserOrders(): Promise<{
  orders: Order[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { orders: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { orders: [], error: error.message };
    }

    return { orders: (data || []) as Order[], error: null };
  } catch (err) {
    return {
      orders: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
