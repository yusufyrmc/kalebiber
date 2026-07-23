import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), "data");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");

async function getReviews() {
  try {
    const raw = await fs.readFile(REVIEWS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET() {
  let reviews = [];

  if (isSupabaseConfigured) {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client.from("reviews").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        reviews = data;
      }
    } catch (e) {
      console.error("Supabase reviews error:", e);
    }
  }

  if (reviews.length === 0) {
    reviews = await getReviews();
  }

  const approved = reviews.filter((r) => r.approved !== false);
  const starCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;

  approved.forEach((r) => {
    const star = Math.min(5, Math.max(1, Number(r.rating) || 5));
    starCount[star] = (starCount[star] || 0) + 1;
    totalRating += star;
  });

  const avg = approved.length ? (totalRating / approved.length).toFixed(1) : "5.0";

  return NextResponse.json({
    success: true,
    reviews: approved,
    avgRating: avg,
    totalCount: approved.length,
    starBreakdown: starCount,
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { author, rating, text, productId } = body;

    if (!author || !text) {
      return NextResponse.json({ error: "Lütfen adınızı ve yorumunuzu girin." }, { status: 400 });
    }

    const newReview = {
      id: `REV-${Date.now()}`,
      author: String(author).trim().slice(0, 60),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      text: String(text).trim().slice(0, 2000),
      product_id: productId || null,
      created_at: new Date().toISOString(),
      approved: true,
    };

    if (isSupabaseConfigured) {
      const client = supabaseAdmin || supabase;
      const { error } = await client.from("reviews").insert(newReview);
      if (error) {
        console.error("Supabase review error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, review: newReview });
    }

    try {
      const reviews = await getReviews();
      reviews.unshift(newReview);
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf8");
    } catch (e) {
      console.warn("Local JSON review write skipped/failed:", e.message);
    }

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
