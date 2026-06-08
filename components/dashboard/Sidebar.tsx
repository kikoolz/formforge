"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Grid2X2,
  Inbox,
  LogOut,
  Plus,
  Settings,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import FormForgeLogo from "@/components/FormForgeLogo";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User as AppUser } from "@/types";

const NAV_ITEMS = [
  { label: "Forms", href: "/dashboard", icon: Grid2X2 },
  { label: "New form", href: "/dashboard/forms/new", icon: Plus },
  { label: "Submissions", href: "/dashboard/submissions", icon: Inbox },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar({
  user,
  profile,
  onSignOut,
}: {
  user: SupabaseUser | null;
  profile?: AppUser | null;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Account";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[258px] border-r border-border bg-background lg:flex lg:flex-col">
      <div className="flex h-[75px] items-center border-b border-border px-4">
        <Link href="/">
          <FormForgeLogo />
        </Link>
      </div>

      <nav className="flex-1 space-y-2 p-2 pt-4">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors ${
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg px-1 text-muted-foreground">
          <ThemeToggle variant="nav" />
          <span className="text-[13px]">Theme</span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[12px] text-muted-foreground">
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
