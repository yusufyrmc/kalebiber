import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const FINANCE_FILE = path.join(process.cwd(), "data", "finance.json");

async function readFinance() {
  try {
    const raw = await fs.readFile(FINANCE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { transactions: [], categories: { income: ["siparis", "diger"], expense: ["malzeme", "kargo", "iscilik", "diger"] } };
  }
}

async function writeFinance(data) {
  await fs.writeFile(FINANCE_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function GET(req) {
  try {
    const data = await readFinance();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    let transactions = data.transactions || [];

    if (type) transactions = transactions.filter(t => t.type === type);
    if (from) transactions = transactions.filter(t => t.date >= from);
    if (to) transactions = transactions.filter(t => t.date <= to);

    return NextResponse.json({
      success: true,
      transactions,
      categories: data.categories || {},
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const data = await readFinance();

    const entry = {
      id: body.id || `TX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      type: body.type || "income",
      category: body.category || "diger",
      amount: Number(body.amount) || 0,
      description: body.description || "",
      date: body.date || new Date().toISOString().slice(0, 10),
      orderId: body.orderId || "",
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = data.transactions.findIndex(t => t.id === entry.id);
    if (existing > -1) {
      data.transactions[existing] = entry;
    } else {
      data.transactions.unshift(entry);
    }

    await writeFinance(data);
    return NextResponse.json({ success: true, transaction: entry });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

    const data = await readFinance();
    data.transactions = data.transactions.filter(t => t.id !== id);
    await writeFinance(data);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
