"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/dashboard/Sidebar";
import type { PlanType, User as AppUser } from "@/types";
import { PLAN_LIMITS } from "@/types";

type BillingInterval = "monthly" | "annual";

const PLANS: {
  key: PlanType;
  name: string;
  desc: string;
  price: number;
  yearly: number;
  yearlyPrice: number;
  features: string[];
}[] = [
  {
    key: "free",
    name: "Free",
    desc: "Try it out",
    price: 0,
    yearly: 0,
    yearlyPrice: 0,
    features: ["3 forms", "10 submissions / month", "FormForge branding"],
  },

  {
    key: "solo",
    name: "Solo",
    desc: "For freelancers",
    price: 29,
    yearly: 23,
    yearlyPrice: 276,
    features: [
      "10 forms",
      "100 submissions / month",
      "Remove branding",
      "Custom redirect",
    ],
  },

  {
    key: "professional",
    name: "Professional",
    desc: "For small teams",
    price: 79,
    yearly: 63,
    yearlyPrice: 756,
    features: [
      "50 forms",
      "500 submissions / month",
      "Custom branding & logo",
      "Integrations",
    ],
  },

  {
    key: "team",
    name: "Team",
    desc: "For larger teams",
    price: 149,
    yearly: 119,
    yearlyPrice: 1428,
    features: [
      "Unlimited forms",
      "Unlimited submissions",
      "Team members",
      "Priority support",
    ],
  },
];

function SubscriptionSuccessToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription updated!");
    }
  }, [searchParams]);

  return null;
}

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as AppUser);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace("/login");
  };

  async function handleUpgrade(plan: PlanType) {
    setUpgrading(plan);
    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: billingInterval }),
      });
      const { data, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Upgrade failed");
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageSubscription() {
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const { data, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = profile?.plan || "free";

  return (
    <div className="min-h-screen bg-background text-foreground [zoom:0.93] 2xl:[zoom:0.97]">
      <Suspense fallback={null}>
        <SubscriptionSuccessToast />
      </Suspense>
      <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />
      <main className="min-h-screen lg:pl-[258px]">
        <header className="flex h-[75px] items-center border-b border-border px-4 lg:px-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Billing
          </h1>
        </header>

        <div className="p-4 lg:p-6 max-w-[1200px]">
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold mb-1">
              Current plan:{" "}
              <span className="text-primary capitalize">{currentPlan}</span>
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {PLAN_LIMITS[currentPlan].forms === 999999
                ? "Unlimited"
                : PLAN_LIMITS[currentPlan].forms}{" "}
              forms ·{" "}
              {PLAN_LIMITS[currentPlan].submissions === 999999
                ? "Unlimited"
                : PLAN_LIMITS[currentPlan].submissions}{" "}
              submissions/month ·{" "}
              {billingInterval === "annual" &&
              PLAN_LIMITS[currentPlan].price > 0
                ? `$${PLANS.find((p) => p.key === currentPlan)?.yearly ?? PLAN_LIMITS[currentPlan].price}/mo billed annually`
                : `$${PLAN_LIMITS[currentPlan].price}/mo`}
            </p>
          </div>

          {/* Billing interval toggle */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${billingInterval === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billingInterval === "annual"}
              onClick={() =>
                setBillingInterval(
                  billingInterval === "monthly" ? "annual" : "monthly",
                )
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                billingInterval === "annual" ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow transition-transform ${
                  billingInterval === "annual"
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm ${billingInterval === "annual" ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                Save 20%
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              const isDowngrade = plan.key === "free" && currentPlan !== "free";
              const limits = PLAN_LIMITS[plan.key];
              const price =
                billingInterval === "annual" ? plan.yearly : plan.price;

              return (
                <div
                  key={plan.key}
                  className={`rounded-xl p-6 ${isCurrent ? "glass-strong shadow-elegant ring-1 ring-primary/40" : "glass"}`}
                >
                  <p className="font-display text-lg font-semibold">
                    {plan.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground mb-5">
                    {plan.desc}
                  </p>
                  <p className="font-display text-4xl font-semibold tracking-tight">
                    ${price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  </p>
                  {billingInterval === "annual" && plan.price > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      ${plan.yearlyPrice} billed annually
                    </p>
                  )}

                  {isCurrent && currentPlan !== "free" ? (
                    <Button
                      onClick={handleManageSubscription}
                      variant="outline"
                      className="mt-6 w-full h-10 text-[13px]"
                    >
                      Manage
                    </Button>
                  ) : isCurrent ? (
                    <div className="mt-6 w-full h-10 rounded-md bg-accent flex items-center justify-center text-[13px] text-muted-foreground">
                      Current plan
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={upgrading === plan.key}
                      className="mt-6 w-full h-10 text-[13px]"
                    >
                      {upgrading === plan.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                      ) : null}
                      {isDowngrade ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}

                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[13px] text-muted-foreground"
                      >
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
