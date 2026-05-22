import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, request.url));
      }
      console.error("OAuth code exchange failed:", error.message);
    } catch (err) {
      console.error("Authentication callback exception:", err);
    }
  }

  // Return the user to an error page or home if code exchange fails
  return NextResponse.redirect(new URL("/auth/auth-error", request.url));
}
