import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.");
  }
  _client = createClient(url, key);
  return _client;
}

export interface Proposal {
  id: string;
  url: string;
  title: string | null;
  content: string;
  prompt_used: string | null;
  created_at: string;
}

export async function saveProposal(data: Omit<Proposal, "id" | "created_at">) {
  const { error } = await getClient().from("proposals").insert(data);
  if (error) throw error;
}

export async function getProposals(): Promise<Proposal[]> {
  const { data, error } = await getClient()
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await getClient()
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function deleteProposal(id: string) {
  const { error } = await getClient().from("proposals").delete().eq("id", id);
  if (error) throw error;
}
