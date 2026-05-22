'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Updates the status of an active order inside the database.
 * Honors client-side cookies and RLS policies since it uses standard cookies server client.
 */
export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    throw new Error(`KDS pipeline commit failure: ${error.message}`);
  }

  revalidatePath("/admin");
  return data;
}

/**
 * Promotes any logged-in user account to an admin/staff role inside public.admin_users.
 * Bypasses RLS write-blocks by instantiating a backend service role client.
 */
export async function promoteToAdminAction(userId: string, email: string) {
  if (!userId || !email) {
    throw new Error("Missing required user credentials for promotion.");
  }

  const { createClient: createSupabaseAdmin } = await import("@supabase/supabase-js");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error("Supabase environment configuration is missing service keys.");
  }

  const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey);

  // Insert or update the user inside admin_users
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .upsert({
      id: userId,
      email,
      role: "admin"
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Onboarding promotion error: ${error.message}`);
  }

  return data;
}

/**
 * Cancels an order and automatically issues a full Stripe payment refund if applicable.
 */
export async function declineAndRefundOrder(orderId: string) {
  const supabase = await createClient();

  // 1. Retrieve the payment intent before updating status
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("stripe_payment_intent, status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    throw new Error(`Could not find order for cancellation: ${fetchError?.message || "Not found"}`);
  }

  // 2. Set the status of the order to cancelled in the database
  const { data, error: updateError } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Database cancellation error: ${updateError.message}`);
  }

  // 3. Process Stripe refund if there is an active Stripe payment intent
  const paymentIntentId = order.stripe_payment_intent;
  if (paymentIntentId) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.warn("Stripe key is missing; skipping refund transaction.");
    } else {
      try {
        const StripeClass = (await import("stripe")).default;
        const stripe = new StripeClass(stripeKey);

        console.log(`Initiating refund for PaymentIntent: ${paymentIntentId}`);
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
        console.log("Stripe refund processed successfully.");
      } catch (stripeErr: any) {
        console.error("Stripe refund transaction failed:", stripeErr.message);
        // We log the warning but don't crash, since the order status was already set to cancelled
      }
    }
  }

  revalidatePath("/admin");
  return data;
}

/**
 * Creates or updates a menu item inside the database.
 */
export async function upsertMenuItem(item: {
  id?: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  available?: boolean;
  popular?: boolean;
  calories?: number;
}) {
  const supabase = await createClient();

  const payload: any = {
    category_id: item.category_id,
    name: item.name,
    description: item.description || null,
    price: Number(item.price),
    image_url: item.image_url || "/img/menu/garlic-bread.jpg",
    available: item.available ?? true,
    popular: item.popular ?? false,
    calories: item.calories ? parseInt(String(item.calories)) : 0,
  };

  if (item.id) {
    payload.id = item.id;
  }

  const { data, error } = await supabase
    .from("menu_items")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert menu item: ${error.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return data;
}

/**
 * Updates a menu item's price inline.
 */
export async function updateMenuItemPrice(itemId: string, price: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .update({ price: Number(price) })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update menu item price: ${error.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return data;
}

/**
 * Updates a menu item's name inline.
 */
export async function updateMenuItemName(itemId: string, name: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .update({ name })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update menu item name: ${error.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return data;
}

/**
 * Toggles a menu item's availability.
 */
export async function toggleMenuItemAvailability(itemId: string, available: boolean) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .update({ available })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to toggle menu item availability: ${error.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return data;
}

/**
 * Deletes a menu item.
 */
export async function deleteMenuItem(itemId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to delete menu item: ${error.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return true;
}

/**
 * Creates or updates a category inside the database.
 */
export async function upsertCategory(category: {
  id?: string;
  name: string;
  sort_order?: number;
}) {
  const supabase = await createClient();
  const restaurantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; // Kitchio Restaurant ID

  const payload: any = {
    restaurant_id: restaurantId,
    name: category.name,
    sort_order: category.sort_order ?? 0,
  };

  if (category.id) {
    payload.id = category.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert category: ${error.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return data;
}

/**
 * Deletes a category from the database.
 */
export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return true;
}

/**
 * Seeds categories and menu items from demo categories into Supabase if empty.
 */
export async function seedMenuFromDemo() {
  const supabase = await createClient();
  const restaurantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  // Check if categories are already loaded
  const { data: existingCategories, error: countError } = await supabase
    .from("categories")
    .select("id")
    .eq("restaurant_id", restaurantId);

  if (countError) {
    throw new Error(`Database check failed: ${countError.message}`);
  }

  if (existingCategories && existingCategories.length > 0) {
    return { count: existingCategories.length, status: "already_seeded" };
  }

  // Define categories to insert
  const demoCats = [
    { id: "11111111-1111-1111-1111-111111111111", name: "Starters", sort_order: 1 },
    { id: "22222222-2222-2222-2222-222222222222", name: "Pizzas", sort_order: 2 },
    { id: "33333333-3333-3333-3333-333333333333", name: "Sides", sort_order: 3 },
    { id: "44444444-4444-4444-4444-444444444444", name: "Desserts", sort_order: 4 },
    { id: "55555555-5555-5555-5555-555555555555", name: "Drinks", sort_order: 5 },
  ];

  // Insert categories
  const { error: catInsertError } = await supabase
    .from("categories")
    .insert(
      demoCats.map((cat) => ({
        id: cat.id,
        restaurant_id: restaurantId,
        name: cat.name,
        sort_order: cat.sort_order,
      }))
    );

  if (catInsertError) {
    throw new Error(`Failed to seed categories: ${catInsertError.message}`);
  }

  // Import static demoMenuCategories dynamically to grab items
  const { demoMenuCategories } = await import("@/data/restaurant");

  // Create list of menu items mapping old category slugs to new category UUIDs
  const slugToUuidMap: Record<string, string> = {
    starters: "11111111-1111-1111-1111-111111111111",
    pizzas: "22222222-2222-2222-2222-222222222222",
    sides: "33333333-3333-3333-3333-333333333333",
    desserts: "44444444-4444-4444-4444-444444444444",
    drinks: "55555555-5555-5555-5555-555555555555",
  };

  const itemsToInsert: any[] = [];
  for (const cat of demoMenuCategories) {
    const catUuid = slugToUuidMap[cat.id];
    if (!catUuid) continue;

    for (const item of cat.items) {
      itemsToInsert.push({
        category_id: catUuid,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image || "/img/menu/garlic-bread.jpg",
        available: item.available ?? true,
        popular: item.isPopular ?? false,
        calories: item.calories ?? 0,
      });
    }
  }

  // Insert menu items
  const { error: itemsInsertError } = await supabase
    .from("menu_items")
    .insert(itemsToInsert);

  if (itemsInsertError) {
    throw new Error(`Failed to seed menu items: ${itemsInsertError.message}`);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return { status: "success", count: itemsToInsert.length };
}

