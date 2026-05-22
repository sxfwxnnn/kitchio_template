"use server";

import { createClient } from "@/lib/supabase/server";
import { Order, OrderItem, CartItem, OrderMode } from "@/types";

export async function createOrder(params: {
  restaurantId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
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

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: params.restaurantId,
        user_id: user?.id || null,
        status: "pending",
        subtotal: params.subtotal,
        delivery_fee: params.deliveryFee,
        total: params.total,
        delivery_mode: params.deliveryMode,
        customer_name: params.customerName,
        customer_phone: params.customerPhone,
        delivery_address: params.deliveryAddress,
        special_instructions: params.specialInstructions,
        stripe_payment_intent: params.stripePaymentIntent,
      })
      .select()
      .single();

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
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

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
