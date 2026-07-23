import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export async function GET() {
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
      about: {
        title: "Hakkımızda",
        content: "Yarımca Kale Bibercisi olarak taze ve doğal biber ürünleri sunuyoruz.",
        photos: [],
      },
      navbar: {
        eyebrow: "Bahçeden sofraya",
        title: "Taze biber,",
        titleAccent: "gerçek lezzet",
        imageUrl: "",
        logoUrl: "/images/logo-yuvarlak.png",
      },
    });
  }
}
