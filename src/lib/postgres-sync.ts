/**
 * postgres-sync.ts — Multi-user sync via Supabase Postgres Changes.
 *
 * When Supabase is configured, subscribe to row-level changes on the tickets
 * and feedback tables. Any insert/update/delete — from any user — triggers a
 * debounced callback so the local store can re-pull the authoritative snapshot
 * and refresh the UI without a manual reload.
 *
 * When Supabase isn't configured this is a no-op; cross-tab sync still works
 * through the BroadcastChannel transport.
 *
 * Browser-only.
 */

import { createClient, isSupabaseConfigured } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const DEBOUNCE_MS = 600;

let channel: RealtimeChannel | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start listening for Postgres changes. Returns an unsubscribe function.
 * Safe to call once at store init; no-ops when Supabase isn't configured or
 * already subscribed.
 */
export function subscribeToPostgresChanges(onChange: () => void): () => void {
  if (typeof window === "undefined" || !isSupabaseConfigured() || channel) {
    return () => {};
  }

  const supabase = createClient();

  const schedule = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onChange();
    }, DEBOUNCE_MS);
  };

  channel = supabase
    .channel("concilium:db-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, schedule)
    .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, schedule)
    .on("postgres_changes", { event: "*", schema: "public", table: "build_reports" }, schedule)
    .subscribe();

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}
