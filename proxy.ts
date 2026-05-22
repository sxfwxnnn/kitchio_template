import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip if Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Protect the admin route exclusively
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login?next=/admin", request.url));
    }

    // Double check record validation against the admin_users table
    const { data: adminProfile } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!adminProfile) {
      // Not an admin profile? Boot them cleanly to safety
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Refresh the session — important for Server Components
  await supabase.auth.getUser();

  return supabaseResponse;
}

// Support both default and named export to be completely safe
export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|img/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
