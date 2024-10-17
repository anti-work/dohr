import { NextRequest, NextResponse } from 'next/server';
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const photo = formData.get('photo') as File;
  const audio_url = formData.get('audio_url') as string;

  const photoBuffer = await photo.arrayBuffer();

  try {
    await sql`
      INSERT INTO users (name, audio_url, photo)
      VALUES (${name}, ${audio_url}, ${Buffer.from(photoBuffer)})
    `;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}
