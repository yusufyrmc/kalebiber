import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");

async function getReviews() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(REVIEWS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveReviews(reviews) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf8");
}

export async function GET() {
  const reviews = await getReviews();
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
      productId: productId || "",
      createdAt: new Date().toISOString(),
      approved: true, // varsayılan onaylı
    };

    const reviews = await getReviews();
    reviews.unshift(newReview);
    await saveReviews(reviews);

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
