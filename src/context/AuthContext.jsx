"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchUserProfile = useCallback(async (currentSession) => {
    if (!currentSession?.user) {
      setUser(null);
      setToken(null);
      setSession(null);
      return;
    }

    setSession(currentSession);
    setToken(currentSession.access_token);

    const authUser = currentSession.user;
    const meta = authUser.user_metadata || {};

    let profileData = {};
    if (supabase) {
      try {
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (!error && prof) {
          profileData = prof;
        }
      } catch (e) {
        console.warn("Profile load error:", e.message);
      }
    }

    const compiledUser = {
      id: authUser.id,
      email: authUser.email,
      name: profileData.name || meta.name || authUser.email?.split("@")[0] || "",
      phone: profileData.phone || meta.phone || "",
      address: profileData.address || "",
      city: profileData.city || "",
    };

    setUser(compiledUser);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      fetchUserProfile(initialSession).finally(() => setLoading(false));
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      await fetchUserProfile(currentSession);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const loginWithEmail = async (email, password) => {
    if (!supabase) throw new Error("Supabase henüz yapılandırılmamış.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      let msg = error.message;
      if (msg === "Invalid login credentials") {
        msg = "E-posta adresi veya şifre hatalı.";
      }
      throw new Error(msg);
    }

    if (data?.session) {
      await fetchUserProfile(data.session);
    }
    return data;
  };

  const signUpWithEmail = async ({ email, password, name, phone }) => {
    if (!supabase) throw new Error("Supabase henüz yapılandırılmamış.");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name?.trim() || "",
          phone: phone?.trim() || "",
        },
      },
    });

    if (error) {
      let msg = error.message;
      if (msg.includes("User already registered")) {
        msg = "Bu e-posta adresi ile zaten kayıtlı bir hesap var.";
      } else if (msg.includes("Password should be at least")) {
        msg = "Şifre en az 6 karakter olmalıdır.";
      }
      throw new Error(msg);
    }

    if (data?.session) {
      await fetchUserProfile(data.session);
    } else if (data?.user && !data?.session) {
      // Email confirmation required or pending
      return { confirmationRequired: true, user: data.user };
    }

    return data;
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("SignOut error:", e);
      }
    }
    setUser(null);
    setToken(null);
    setSession(null);
  };

  const updateProfile = async (updatedFields) => {
    if (!user || !supabase) return false;
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          ...updatedFields,
          updated_at: new Date().toISOString(),
        });

      if (!error) {
        setUser((prev) => ({ ...prev, ...updatedFields }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Update profile error:", e);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        token,
        loading,
        loginWithEmail,
        signUpWithEmail,
        logout,
        updateProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

