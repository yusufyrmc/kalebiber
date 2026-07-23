import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const FINANCE_FILE = path.join(process.cwd(), "data", "finance.json");

async function readLocalFinance() {
  try {
    const raw = await fs.readFile(FINANCE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { transactions: [], categories: { income: ["siparis", "diger"], expense: ["malzeme", "kargo", "iscilik", "diger"] } };
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    let transactions = [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from("finance_transactions").select("*");
      if (!error && data) {
        transactions = data.map(t => ({
          ...t,
          orderId: t.order_id,
        }));
      }
    }

    if (transactions.length === 0) {
      const local = await readLocalFinance();
      transactions = local.transactions || [];
    }

    if (type) transactions = transactions.filter(t => t.type === type);
    if (from) transactions = transactions.filter(t => t.date >= from);
    if (to) transactions = transactions.filter(t => t.date <= to);

    return NextResponse.json({
      success: true,
      transactions,
      categories: { income: ["siparis", "diger"], expense: ["malzeme", "kargo", "iscilik", "diger"] },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const entry = {
      id: body.id || `TX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      type: body.type || "income",
      category: body.category || "diger",
      amount: Number(body.amount) || 0,
      description: body.description || "",
      date: body.date || new Date().toISOString().slice(0, 10),
      order_id: body.orderId || "",
    };

    if (isSupabaseConfigured && supabase) {
      const { data: insertedData, error } = await supabase.from("finance_transactions").upsert(entry).select();
      if (error) {
        console.error("Supabase finance upsert error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, transaction: { ...entry, orderId: entry.order_id } });
    }

    try {
      const data = await readLocalFinance();
      const existing = data.transactions.findIndex(t => t.id === entry.id);
      if (existing > -1) {
        data.transactions[existing] = { ...entry, orderId: entry.order_id };
      } else {
        data.transactions.unshift({ ...entry, orderId: entry.order_id });
      }
      await fs.mkdir(path.dirname(FINANCE_FILE), { recursive: true });
      await fs.writeFile(FINANCE_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.warn("Local finance JSON write skipped/failed:", e.message);
    }

    return NextResponse.json({ success: true, transaction: { ...entry, orderId: entry.order_id } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    try {
      const data = await readLocalFinance();
      data.transactions = data.transactions.filter(t => t.id !== id);
      await fs.writeFile(FINANCE_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.warn("Local finance JSON delete skipped/failed:", e.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
