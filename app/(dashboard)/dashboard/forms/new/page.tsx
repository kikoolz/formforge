"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CreditCard,
  FileType,
  FileUp,
  Grid2X2,
  Inbox,
  Layout,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import FormForgeLogo from "@/components/FormForgeLogo";
import type { FormType } from "@/types";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

const STAGE_LABEL: Record<Stage, string> = {
  idle: "Ready",
  uploading: "Uploading PDF\u2026",
  processing: "AI detecting fields\u2026",
  done: "Done",
  error: "Failed",
};

function Sidebar({ user, onSignOut }: { user: SupabaseUser | null; onSignOut: () => void }) {
  const navItems = [
    { label: "Forms", href: "/dashboard", icon: Grid2X2 },
    { label: "New form", href: "/dashboard/forms/new", icon: Plus, active: true },
    { label: "Submissions", href: "/dashboard/submissions", icon: Inbox },
    { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Account";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[258px] border-r border-border bg-background lg:flex lg:flex-col">
      <div className="flex h-[75px] items-center border-b border-border px-4">
        <Link href="/dashboard">
          <FormForgeLogo />
        </Link>
      </div>

      <nav className="flex-1 space-y-2 p-2 pt-4">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors ${
              item.active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg px-1 text-muted-foreground">
          <ThemeToggle variant="nav" />
          <span className="text-[13px]">Theme</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">{displayName}</p>
            <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
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

export default function NewFormPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [showChoice, setShowChoice] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !user) {
        router.replace("/login?redirectTo=/dashboard/forms/new");
        return;
      }
      setUser(user);
    }

    loadUser();
    return () => { mounted = false; };
  }, [router, supabase]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    router.replace("/login");
  };

  const pollForCompletion = async (formId: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const response = await fetch(`/api/forms/${formId}`);
      const { data } = await response.json();
      if (data?.status === "ready") return;
      if (data?.status === "error") throw new Error("AI processing failed");
    }
    throw new Error("Processing timed out");
  };

  const handleFile = useCallback(async (file: File) => {
    if (!user) return;
    setErrorMsg(null);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("PDF files only");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large. Max 25 MB.");
      return;
    }

    try {
      setStage("uploading");
      setProgress(20);

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("title", file.name.replace(/\.pdf$/i, ""));

      setProgress(50);
      const response = await fetch("/api/upload/pdf", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Upload failed");

      setProgress(80);
      setStage("processing");

      await pollForCompletion(result.data.formId);

      setProgress(100);
      setStage("done");
      setFormId(result.data.formId);

      if (result.warning) {
        setErrorMsg(result.warning);
      }

      setShowChoice(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setStage("error");
      setErrorMsg(message);
      toast.error(`Upload failed: ${message}`);
    }
  }, [user]);

  async function handleTypeChoice(formType: FormType) {
    if (!formId) return;
    setShowChoice(false);

    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_type: formType }),
      });
      if (!response.ok) throw new Error("Failed to set form type");
      toast.success("Form ready!");
      router.push(`/dashboard/forms/${formId}/edit`);
    } catch {
      toast.error("Failed to set form type");
      router.push(`/dashboard/forms/${formId}/edit`);
    }
  }

  const busy = stage !== "idle" && stage !== "error" && stage !== "done";

  return (
    <div className="min-h-screen bg-background text-foreground [zoom:0.93] 2xl:[zoom:0.97]">
      <Sidebar user={user} onSignOut={handleSignOut} />

      <main className="min-h-screen lg:pl-[258px]">
        <header className="flex h-[75px] items-center border-b border-border px-4 lg:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="mr-4 h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-2xl font-semibold tracking-tight">New form</h1>
        </header>

        <div className="flex min-h-[calc(100vh-75px)] items-start justify-center px-6 py-14 lg:py-16">
          <div className="w-full max-w-[680px]">
            <div className="mb-9 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mb-3 font-display text-[28px] font-semibold tracking-tight">Upload a PDF</h2>
              <p className="text-[15px] text-muted-foreground">
                We&apos;ll read it and turn every blank into a fillable field automatically.
              </p>
            </div>

            <label
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              className={`block cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-card/40"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />

              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50">
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <FileUp className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <p className="mb-2 text-[17px] font-medium">
                {busy ? STAGE_LABEL[stage] : "Drop your PDF here or click to browse"}
              </p>
              <p className="text-[13px] text-muted-foreground">PDF · max 25 MB</p>
            </label>

            {(busy || stage === "done") && (
              <div className="mt-6 space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-[12px] text-muted-foreground">{STAGE_LABEL[stage]}</p>
              </div>
            )}

            {errorMsg && (
              <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                {errorMsg}
              </div>
            )}

            <p className="mt-9 text-center text-[13px] text-muted-foreground/70">
              Currently optimised for text-based PDFs. Scanned (image-only) PDFs will produce no fields.
            </p>
          </div>
        </div>
      </main>

      {/* Form type choice dialog */}
      {showChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-8 shadow-2xl">
            <h3 className="mb-2 text-center text-xl font-semibold tracking-tight">
              How do you want to display your form?
            </h3>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Choose how respondents will interact with your PDF.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChoice("pdf_overlay")}
                className="group rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20">
                  <FileType className="h-6 w-6" />
                </div>
                <h4 className="mb-1 font-medium">Interactive PDF</h4>
                <p className="text-[13px] text-muted-foreground">
                  Fields are overlaid directly on the PDF itself.
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Auto-position</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Signature pad</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChoice("web_form")}
                className="group rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Layout className="h-6 w-6" />
                </div>
                <h4 className="mb-1 font-medium">Web Form</h4>
                <p className="text-[13px] text-muted-foreground">
                  Fields are displayed in a clean web layout.
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Responsive</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Full control</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowChoice(false);
                router.push(`/dashboard/forms/${formId}/edit`);
              }}
              className="mt-6 w-full text-center text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Skip — I&apos;ll decide later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
