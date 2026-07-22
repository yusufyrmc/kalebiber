import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const PRODUCTS_FILE = path.join(process.cwd(), "products.json");

export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from("products").select("*");
      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, products: data, source: "supabase" });
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
      imageUrl: body.imageUrl || "",
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("products").upsert(newProduct);
      } catch (e) {
        console.error("Supabase insert error:", e);
      }
    }

    const raw = await fs.readFile(PRODUCTS_FILE, "utf8");
    const products = JSON.parse(raw);
    products.push(newProduct);
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf8");

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
