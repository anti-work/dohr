import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "../../../actions";
import { sql } from "@vercel/postgres";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (code) {
    try {
      const data = await exchangeCodeForTokens(code);

      // Store tokens in the database
      await sql`
        UPDATE system
        SET spotify_access_token = ${data.access_token},
            spotify_refresh_token = ${data.refresh_token},
            spotify_token_expiry = ${Date.now() + data.expires_in * 1000}
        WHERE id = 1
      `;

      return NextResponse.redirect(new URL("/", request.url));
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      return NextResponse.redirect(new URL("/", request.url));
    }
  } else {
    console.error("No code provided");
    return NextResponse.redirect(new URL("/", request.url));
  }
}
