import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  try {
    await sendWelcomeEmail(user.email!, name);
    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    console.error("Failed to send welcome email:", err);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}
