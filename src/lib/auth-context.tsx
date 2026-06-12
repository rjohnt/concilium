"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { PersonaId } from "@/lib/types";
import { getPreferredRole, setPreferredRole } from "@/lib/seats";
import { fetchUserProfile, saveProjectRole, UserProfile } from "@/lib/profile";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Server-backed display name, falling back to auth metadata / email. */
  displayName: string | null;
  /** The role this user holds on the project, remembered across sessions. */
  preferredRole: PersonaId | null;
  /** Persist a role choice for this project (server when signed in, plus localStorage). */
  saveRole: (role: PersonaId) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  displayName: null,
  preferredRole: null,
  saveRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Restore session on mount
    const restoreSession = async () => {
      try {
        if (!isSupabaseConfigured()) {
          setLoading(false);
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Failed to restore session:", error);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Load the server-backed profile (display name + remembered role) once the
  // user is known. A pre-auth localStorage role choice is adopted on first
  // sign-in so the preference follows the account from then on.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetchUserProfile(user.id)
      .then((p) => {
        if (cancelled) return;
        if (!p.preferredRole) {
          const local = getPreferredRole();
          if (local) {
            p = { ...p, preferredRole: local };
            saveProjectRole(user.id, local).catch(() => {});
          }
        }
        setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile({ displayName: null, preferredRole: null });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveRole = useCallback(
    (role: PersonaId) => {
      setPreferredRole(role);
      setProfile((p) => (p ? { ...p, preferredRole: role } : p));
      if (user) saveProjectRole(user.id, role).catch(() => {});
    },
    [user]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const displayName =
    profile?.displayName ??
    (user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0]) ??
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut,
        displayName,
        preferredRole: profile?.preferredRole ?? null,
        saveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
