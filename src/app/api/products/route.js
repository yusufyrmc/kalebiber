import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRODUCTS_FILE = path.join(process.cwd(), "products.json");

export async function GET() {
  try {
    if (isSupabaseConfigured) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client.from("products").select("*").order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        // Map Supabase column snake_case format to API format
        const products = data.map(p => ({
          ...p,
          imageUrl: p.image_url || p.imageUrl || "",
          image_url: p.image_url || p.imageUrl || "",
        }));
        return NextResponse.json(
          { success: true, products, source: "supabase" },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
      if (error) {
        console.error("Supabase products fetch error:", error);
      }
    }
  } catch (e) {
    console.error("Supabase products fetch error, falling back to JSON:", e);
  }

  try {
    const raw = await fs.readFile(PRODUCTS_FILE, "utf8");
    const products = JSON.parse(raw);
    return NextResponse.json({ success: true, products, source: "local_json" });
  } catch (error) {
    return NextResponse.json({ success: false, products: [] });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const newProduct = {
      id: body.id || `product-${Date.now()}`,
      name: body.name || "Yeni Biber",
      desc: body.desc || "",
      price: Number(body.price) || 0,
      unit: body.unit || "kg",
      category: body.category || "taze",
      badge: body.badge || "",
      stock: Number(body.stock) || 100,
      active: true,
      featured: Boolean(body.featured),
      image_url: body.imageUrl || body.image_url || "",
    };

    if (isSupabaseConfigured) {
      const client = supabaseAdmin || supabase;
      const { error } = await client.from("products").upsert(newProduct);
      if (error) {
        console.error("Supabase upsert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, product: { ...newProduct, imageUrl: newProduct.image_url } });
    }

    // Serverless (Vercel) fallback handling
    try {
      const raw = await fs.readFile(PRODUCTS_FILE, "utf8");
      const products = JSON.parse(raw);
      products.push({ ...newProduct, imageUrl: newProduct.image_url });
      await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf8");
    } catch (e) {
      console.warn("Local JSON write skipped/failed:", e.message);
    }

    return NextResponse.json({ success: true, product: { ...newProduct, imageUrl: newProduct.image_url } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
