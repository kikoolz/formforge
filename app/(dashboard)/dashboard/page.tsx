"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Copy,
  FileSearch,
  FileText,
  HardDrive,
  Inbox,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "@/components/dashboard/Sidebar";
import FormForgeLogo from "@/components/FormForgeLogo";
import type { User as AppUser } from "@/types";

type Form = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  original_pdf_url: string | null;
  branding_color: string | null;
  logo_url: string | null;
  status: string | null;
  is_published: boolean | null;
  public_slug: string | null;
  submission_count: number | null;
  created_at: string | null;
};

function formatRelativeDate(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return "Recently";
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: typeof FileText;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg glass p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="font-display text-4xl font-semibold tracking-tight">
          {value}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    totalForms: 0,
    totalSubs: 0,
    monthSubs: 0,
  });

  async function fetchForms(currentUser: SupabaseUser) {
    setLoading(true);

    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const currentForms = (data || []) as Form[];
    setForms(currentForms);

    const totalSubs = currentForms.reduce(
      (sum, form) => sum + (form.submission_count || 0),
      0,
    );
    const formIds = currentForms.map((form) => form.id);

    let monthSubs = 0;

    if (formIds.length > 0) {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const { count } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .gte("submitted_at", monthAgo.toISOString())
        .in("form_id", formIds);

      monthSubs = count || 0;
    }

    setStats({ totalForms: currentForms.length, totalSubs, monthSubs });
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function loadUserAndForms() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !user) {
        router.replace("/login?redirectTo=/dashboard");
        return;
      }

      setUser(user);

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (userData) setProfile(userData as AppUser);

      await fetchForms(user);
    }

    loadUserAndForms();

    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredForms = useMemo(() => {
    return forms.filter((form) =>
      form.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [forms, search]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    router.replace("/login");
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("forms").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Form deleted");
    if (user) await fetchForms(user);
  }

  async function handleDuplicate(form: Form) {
    if (!user) return;

    const { data, error } = await supabase
      .from("forms")
      .insert({
        user_id: user.id,
        title: `${form.title} (copy)`,
        description: form.description,
        original_pdf_url: form.original_pdf_url,
        branding_color: form.branding_color,
        logo_url: form.logo_url,
        status: "ready",
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data) {
      const { data: fields } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", form.id);

      if (fields?.length) {
        await supabase.from("form_fields").insert(
          fields.map(({ id: _id, created_at: _createdAt, ...field }) => ({
            ...field,
            form_id: data.id,
          })),
        );
      }

      toast.success("Form duplicated");
      await fetchForms(user);
    }
  }

  function handleCopyLink(slug: string | null) {
    if (!slug) {
      toast.error("Publish form first");
      return;
    }

    navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`);
    toast.success("Link copied");
  }

  return (
    <div className="min-h-screen bg-background text-foreground [zoom:0.93] 2xl:[zoom:0.97]">
      <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />

      <main className="min-h-screen lg:pl-[258px]">
        <header className="flex h-[75px] items-center justify-between border-b border-border px-4 lg:px-6">
          <Link
            href="/"
            className="flex items-center gap-3 lg:hidden"
            aria-label="Go to landing page"
          >
            <FormForgeLogo />
          </Link>

          <h1 className="hidden font-display text-2xl font-semibold tracking-tight lg:block">
            Forms
          </h1>

          <Button
            asChild
            className="ml-auto h-12 gap-2 rounded-lg bg-primary px-5 text-[15px] text-primary-foreground shadow-glow hover:bg-primary/90"
          >
            <Link href="/dashboard/forms/new">
              <Plus className="h-4 w-4" />
              New form
            </Link>
          </Button>
        </header>

        <div className="p-4 lg:p-5">
          <div className="mx-auto max-w-[1520px] space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total forms"
                value={stats.totalForms}
                icon={FileText}
                loading={loading}
              />
              <StatCard
                label="Total submissions"
                value={stats.totalSubs}
                icon={Inbox}
                loading={loading}
              />
              <StatCard
                label="This month"
                value={stats.monthSubs}
                icon={FileSearch}
                loading={loading}
              />
              <StatCard
                label="Storage used"
                value="—"
                icon={HardDrive}
                loading={loading}
              />
            </div>

            <div className="relative max-w-[460px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search forms..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 rounded-lg bg-card pl-12 text-[15px]"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <Skeleton key={item} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="flex min-h-[452px] flex-col items-center justify-center rounded-xl glass px-6 py-20 text-center">
                <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 font-display text-2xl font-semibold tracking-tight">
                  {search ? "No forms match" : "No forms yet"}
                </h3>
                <p className="mx-auto mb-8 max-w-[390px] text-[15px] leading-relaxed text-muted-foreground">
                  {search
                    ? "Try a different search term."
                    : "Upload a PDF and let AI turn it into a fillable form in seconds."}
                </p>
                {!search && (
                  <Button
                    asChild
                    className="h-12 gap-2 rounded-lg bg-primary px-6 text-[15px] text-primary-foreground shadow-glow hover:bg-primary/90"
                  >
                    <Link href="/dashboard/forms/new">
                      <Plus className="h-4 w-4" />
                      Create your first form
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/dashboard/forms/${form.id}/edit`)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter")
                        router.push(`/dashboard/forms/${form.id}/edit`);
                    }}
                    className="group cursor-pointer rounded-lg glass p-4 transition-colors hover:bg-card/80"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${form.branding_color || "#6366f1"}20`,
                          color: form.branding_color || "#6366f1",
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </div>

                      <div
                        className="flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            form.status === "ready" && form.is_published
                              ? "bg-success/10 text-success"
                              : form.status === "ready"
                                ? "bg-muted text-muted-foreground"
                                : form.status === "processing"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {form.status === "processing"
                            ? "Processing"
                            : form.is_published
                              ? "Live"
                              : "Draft"}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/dashboard/forms/${form.id}/edit`)
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(form.public_slug)}
                            >
                              <Share2 className="mr-2 h-3.5 w-3.5" /> Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(form)}
                            >
                              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(form.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <h3 className="mb-1 truncate text-[15px] font-medium">
                      {form.title}
                    </h3>
                    <p className="mb-4 line-clamp-1 text-[12px] text-muted-foreground">
                      {form.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between border-t border-border/50 pt-3 font-mono text-[11px] text-muted-foreground">
                      <span>{form.submission_count || 0} submissions</span>
                      <span>{formatRelativeDate(form.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
