"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3 transition-opacity hover:opacity-80"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="10" height="2" rx="1" fill="white" />
          <rect x="1" y="5" width="7" height="2" rx="1" fill="white" />
          <rect x="1" y="9" width="5" height="2" rx="1" fill="white" />
        </svg>
      </div>
      <span className="font-display text-[18px] font-semibold tracking-tight text-foreground">
        FormForge
      </span>
    </Link>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="animate-pulse text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const message = searchParams.get("message");

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      toast.success("Welcome back!");
      router.push(redirectTo);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Send welcome email (fire-and-forget, don't block on failure)
    fetch("/api/email/welcome", { method: "POST" }).catch(() => {});

    toast.success("Account created! Check your email to confirm.");
    router.push(
      `/login?message=check-email&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-mesh p-4 text-foreground">
      <div className="w-full max-w-[460px] space-y-7 rounded-xl glass-strong p-10 shadow-elegant">
        <div className="space-y-2">
          <Logo />
          <p className="text-[13px] text-muted-foreground">
            Turn any PDF into a fillable form in 60 seconds.
          </p>
        </div>

        {message === "check-email" && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3.5 text-center text-sm text-primary-glow">
            Check your inbox and click the confirmation link to activate your
            account.
          </div>
        )}

        {searchParams.get("error") === "auth_callback_error" && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-center text-sm text-destructive">
            Something went wrong. Please try again.
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-2"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "signin" | "signup")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full py-2" disabled={loading}>
                {loading && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full name</Label>
                <Input
                  id="signup-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full py-2" disabled={loading}>
                {loading && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-[11px] text-muted-foreground">
          By continuing you agree to FormForge&apos;s{" "}
          <Link
            href="/terms"
            className="underline transition-colors hover:text-foreground"
          >
            terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
