import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Sunucu tarafı: service_role key kullan (yoksa anon key ile dene)
const supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

const BUCKET = "uploads";

export async function POST(req) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase yapılandırılmamış." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    // Dosyayı ArrayBuffer → Uint8Array olarak al
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    // Benzersiz dosya adı oluştur
    const ext = (file.name || "image").split(".").pop().toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    const safeExt = allowedExts.includes(ext) ? ext : "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    // Supabase Storage'a yükle
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Public URL al
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json({ ok: true, url: urlData.publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
