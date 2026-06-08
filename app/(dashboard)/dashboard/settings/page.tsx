"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Camera,
  Loader2,
  Save,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Sidebar from "@/components/dashboard/Sidebar";
import type { User as AppUser } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { router.replace("/login"); return; }
      setUser(user);

      const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (data) {
        const p = data as AppUser;
        setProfile(p);
        setFullName(p.full_name || "");
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [router, supabase]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    router.replace("/login");
  };

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url || null;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);

        const response = await fetch("/api/upload/avatar", { method: "POST", body: formData });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Upload failed");

        avatarUrl = result.data.avatar_url;
      }

      const { error } = await supabase
        .from("users")
        .update({ full_name: fullName, avatar_url: avatarUrl })
        .eq("id", user!.id);
      if (error) throw new Error(error.message);

      setProfile(prev => prev ? { ...prev, full_name: fullName, avatar_url: avatarUrl } : null);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground [zoom:0.93] 2xl:[zoom:0.97]">
      <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />

      <main className="min-h-screen lg:pl-[258px]">
        <header className="flex h-[75px] items-center border-b border-border px-4 lg:px-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        </header>

        <div className="p-4 lg:p-6 max-w-[680px]">
          <div className="glass rounded-xl p-6 space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold mb-1">Profile</h2>
              <p className="text-[13px] text-muted-foreground">Update your personal details and photo.</p>
            </div>

            {/* Avatar upload */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {(avatarPreview || profile?.avatar_url) ? (
                    <AvatarImage src={avatarPreview || profile!.avatar_url!} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="text-xl">
                    {fullName ? fullName.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Profile picture</p>
                <p className="text-[12px] text-muted-foreground">JPG, PNG, or WEBP. Max 5MB.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
              <p className="text-[11px] text-muted-foreground">Email cannot be changed here.</p>
            </div>

            <div className="space-y-2">
              <Label>Plan</Label>
              <Input value={(profile?.plan || "free").toUpperCase()} disabled className="opacity-60 uppercase text-[12px]" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-4 w-4" />
              Save changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
