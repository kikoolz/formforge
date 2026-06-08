"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Form } from "@/types";

export function useForms() {
  const supabase = createClient();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchForms() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("forms")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (mounted) {
        setForms((data || []) as Form[]);
        setLoading(false);
      }
    }

    fetchForms();

    return () => { mounted = false; };
  }, [supabase]);

  const refetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("forms")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setForms((data || []) as Form[]);
  };

  return { forms, loading, refetch };
}
