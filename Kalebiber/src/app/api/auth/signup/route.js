import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function getUsers() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveUsers(users) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function POST(req) {
  try {
    const { email, password, name, phone } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Lütfen ad, e-posta ve şifre girin." }, { status: 400 });
    }

    const users = await getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kayıtlı." }, { status: 400 });
    }

    const newUser = {
      id: `USR-${Date.now()}`,
      email: email.trim(),
      password,
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      address: "",
      city: "",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await saveUsers(users);

    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      address: newUser.address,
      city: newUser.city,
    };

    const token = `token-${newUser.id}-${Date.now()}`;

    return NextResponse.json({ success: true, user: safeUser, token });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
