import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function getLocalUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "E-posta ve şifre gereklidir." }, { status: 400 });
    }

    // 1. Supabase Auth Login
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const errorMsg = typeof authError === "string" ? authError : (authError.message || JSON.stringify(authError));
        return NextResponse.json({ error: errorMsg }, { status: 401 });
      }

      const user = authData.user;
      
      // Profil verisini çekmeye çalış
      let profileData = {};
      try {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (prof) profileData = prof;
      } catch (e) {
        console.warn("Profile fetch warning:", e.message);
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        name: profileData.name || user.user_metadata?.name || email.split("@")[0],
        phone: profileData.phone || user.user_metadata?.phone || "",
        address: profileData.address || "",
        city: profileData.city || "",
      };

      const token = authData.session?.access_token || `token-${user.id}-${Date.now()}`;

      return NextResponse.json({ success: true, user: safeUser, token });
    }

    // 2. Local Fallback
    const users = await getLocalUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      city: user.city,
    };

    const token = `token-${user.id}-${Date.now()}`;

    return NextResponse.json({ success: true, user: safeUser, token });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
