import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type CacheKey = "summary" | "monthly" | "products" | "partners" | "brn" | "commodity";

export async function saveAnalyticsCache(key: CacheKey, data: unknown): Promise<void> {
  const { error } = await supabase
    .from("analytics_cache")
    .upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) throw new Error(`Supabase save failed [${key}]: ${error.message}`);
}

export async function loadAnalyticsCache<T>(key: CacheKey): Promise<T | null> {
  const { data, error } = await supabase
    .from("analytics_cache")
    .select("data")
    .eq("key", key)
    .single();

  if (error || !data) return null;
  return data.data as T;
}

export async function getLastUpdated(): Promise<string | null> {
  const { data } = await supabase
    .from("analytics_cache")
    .select("updated_at")
    .eq("key", "summary")
    .single();

  return data?.updated_at ?? null;
}
