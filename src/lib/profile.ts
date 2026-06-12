/**
 * profile.ts — Server-backed user identity: display name + remembered project role.
 *
 * A signed-in user's role choice is stored per project in `project_roles`
 * (one project today — PROJECT_KEY — but keyed so per-project roles need no
 * migration later). Reads/writes go through the browser Supabase client under
 * RLS own-row policies. When Supabase isn't configured everything degrades to
 * the localStorage preference in seats.ts.
 */

import { createClient, isSupabaseConfigured } from "./supabase";
import { PersonaId } from "./types";
import { getAllPersonas } from "./personas";

export const PROJECT_KEY = "concilium";

export interface UserProfile {
  displayName: string | null;
  preferredRole: PersonaId | null;
}

function isPersonaId(value: unknown): value is PersonaId {
  return getAllPersonas().some((p) => p.id === value);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (!isSupabaseConfigured()) {
    return { displayName: null, preferredRole: null };
  }
  const supabase = createClient();
  const [profileRes, roleRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("project_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("project_key", PROJECT_KEY)
      .maybeSingle(),
  ]);
  const role = roleRes.data?.role;
  return {
    displayName: profileRes.data?.display_name ?? null,
    preferredRole: isPersonaId(role) ? role : null,
  };
}

export async function saveProjectRole(userId: string, role: PersonaId): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("project_roles").upsert(
    {
      user_id: userId,
      project_key: PROJECT_KEY,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,project_key" }
  );
}
