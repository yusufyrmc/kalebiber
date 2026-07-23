import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export async function GET() {
  if (isSupabaseConfigured) {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client.from("settings").select("*").single();
      if (!error && data) {
        return NextResponse.json({
          storeName: data.store_name,
          tagline: data.tagline,
          phone: data.phone,
          email: data.email,
          shippingFee: data.shipping_fee,
          freeShippingOver: data.free_shipping_over,
          announcement: data.announcement,
          address: data.address,
          instagram: data.instagram,
          whatsapp: data.whatsapp,
          aboutTitle: data.about?.title || "",
          aboutContent: data.about?.content || "",
          eyebrow: data.navbar?.eyebrow || "",
          title: data.navbar?.title || "",
          titleAccent: data.navbar?.titleAccent || "",
          heroLead: data.navbar?.heroLead || "",
          imageUrl: data.navbar?.imageUrl || "",
          imageAlt: data.navbar?.imageAlt || "",
        });
      }
    } catch (e) {
      console.error("Supabase settings error:", e);
    }
  }

  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    const settings = JSON.parse(raw);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({
      storeName: "Yarımca Kale Bibercisi",
      tagline: "Bahçeden sofraya taze ve doğal biber",
      phone: "+905384478410",
      email: "siparis@kalebiber.com",
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (isSupabaseConfigured) {
      const client = supabaseAdmin || supabase;
      const payload = {
        id: "default",
        store_name: body.storeName || "Yarımca Kale Bibercisi",
        tagline: body.tagline || "",
        phone: body.phone || "",
        email: body.email || "",
        shipping_fee: Number(body.shippingFee) || 0,
        free_shipping_over: Number(body.freeShippingOver) || 0,
        announcement: body.announcement || "",
        address: body.address || "",
        whatsapp: body.whatsapp || "",
        about: {
          title: body.aboutTitle || body.about?.title || "",
          content: body.aboutContent || body.about?.content || "",
        },
        navbar: {
          eyebrow: body.eyebrow || body.navbar?.eyebrow || "",
          title: body.title || body.navbar?.title || "",
          titleAccent: body.titleAccent || body.navbar?.titleAccent || "",
          heroLead: body.heroLead || body.navbar?.heroLead || "",
          imageUrl: body.imageUrl || body.navbar?.imageUrl || "",
          imageAlt: body.imageAlt || body.navbar?.imageAlt || "",
        },
      };

      const { error } = await client.from("settings").upsert(payload);
      if (error) {
        console.error("Supabase settings update error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, settings: body });
    }

    try {
      const dataDir = path.dirname(SETTINGS_FILE);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(body, null, 2), "utf8");
    } catch (e) {
      console.warn("Local settings JSON write skipped/failed:", e.message);
    }

    return NextResponse.json({ success: true, settings: body });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
