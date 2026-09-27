import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "placeholder-anon-key";

if (!import.meta.env.VITE_SUPABASE_URL?.trim() || !import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
  console.error("Missing Supabase environment variables");
  // We'll still create client with placeholders; auth calls will fail gracefully
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);