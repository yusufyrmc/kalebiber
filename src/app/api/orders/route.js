import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

async function getLocalOrders() {
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") || searchParams.get("id") || "").trim().toUpperCase();
  const phone = (searchParams.get("phone") || "").trim();

  let orders = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("orders").select("*");
      if (!error && data) {
        orders = data.map(o => ({
          ...o,
          totalAmount: o.total || o.totalAmount,
          createdAt: o.created_at || o.createdAt,
        }));
      }
    } catch (e) {
      console.error("Supabase orders error:", e);
    }
  }

  if (orders.length === 0) {
    orders = await getLocalOrders();
  }

  if (query || phone) {
    const matched = orders.filter((o) => {
      const idMatch = query && String(o.id || "").toUpperCase().includes(query);
      const phoneMatch = phone && String(o.customer?.phone || o.phone || "").includes(phone);
      return idMatch || phoneMatch;
    });

    return NextResponse.json({ success: true, orders: matched });
  }

  return NextResponse.json({ success: true, orders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { customer, items, paymentMethod } = body;

    if (!customer?.name || !customer?.phone || !customer?.address) {
      return NextResponse.json({ error: "Lütfen zorunlu alanları doldurun." }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Sepetiniz boş." }, { status: 400 });
    }

    const orderId = `KB-${Math.floor(100000 + Math.random() * 900000)}`;
    const totalAmount = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);

    const newOrder = {
      id: orderId,
      created_at: new Date().toISOString(),
      customer,
      items,
      total: totalAmount,
      payment_method: paymentMethod || "kapida",
      status: "yeni",
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("orders").insert(newOrder);
      if (error) {
        console.error("Supabase order insert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, order: { ...newOrder, totalAmount, createdAt: newOrder.created_at } });
    }

    // Try fallback to local file system if not serverless
    try {
      const localOrders = await getLocalOrders();
      localOrders.unshift({ ...newOrder, totalAmount, createdAt: newOrder.created_at });
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(ORDERS_FILE, JSON.stringify(localOrders, null, 2), "utf8");
    } catch (e) {
      console.warn("Local JSON order write skipped/failed:", e.message);
    }

    return NextResponse.json({ success: true, order: { ...newOrder, totalAmount, createdAt: newOrder.created_at } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
