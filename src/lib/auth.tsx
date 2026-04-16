import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Role } from "@/lib/delivery-tracker";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AuthState = {
  fullName: string;
  role: Role;
  email?: string;
};

type AuthContextValue = {
  authState: AuthState | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const getDefaultRouteForRole = (role: Role) => `/${role}`;

export const getAllowedRoute = (role: Role, pathname: string) => {
  const normalized = pathname.replace("/", "");
  return normalized === role ? pathname : getDefaultRouteForRole(role);
};

const fetchProfile = async (userId: string): Promise<AuthState | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    fullName: data.full_name,
    role: data.role as Role,
  };
};

const buildSupabaseAuthState = async (session: Session | null): Promise<AuthState | null> => {
  if (!session?.user) return null;

  const profile = await fetchProfile(session.user.id);
  return profile
    ? {
        ...profile,
        email: session.user.email,
      }
    : null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthState(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const nextAuthState = await buildSupabaseAuthState(session);

      if (isMounted) {
        setAuthState(nextAuthState);
        setIsLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void buildSupabaseAuthState(session).then((nextAuthState) => {
        if (isMounted) {
          setAuthState(nextAuthState);
          setIsLoading(false);
        }
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) {
      return { error: "Supabase auth is not configured for this environment." };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }

    return { error: null };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setAuthState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        isLoading,
        signInWithPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
