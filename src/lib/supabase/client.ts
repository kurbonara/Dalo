import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export function createClient() {
  return createBrowserClient(
    supabaseEnv().url,
    supabaseEnv().key,
  );
}
