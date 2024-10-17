"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  try {
    const result = await sql`
      SELECT id, name, audio_url, photo FROM users
    `;
    console.log(result.rows);
    // Check if result.rows is undefined or empty
    if (!result.rows || result.rows.length === 0) {
      return []; // Return an empty array if no users are found
    }
    return result.rows.map((user) => ({
      ...user,
      photo: user.photo ? Buffer.from(user.photo).toString("base64") : "",
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function removeUser(userId: number) {
  try {
    await sql`DELETE FROM users WHERE id = ${userId}`;
    revalidatePath("/");
  } catch (error) {
    console.error("Error removing user:", error);
    throw new Error("Failed to remove user");
  }
}

export async function registerUser(
  name: string,
  photo_url: string,
  audio_url: string
) {
  try {
    await sql`
      INSERT INTO users (name, audio_url, photo)
      VALUES (${name}, ${audio_url}, ${photo_url})
    `;

    revalidatePath("/");
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("Failed to register user");
  }
}

export async function togglePause() {
  try {
    const result = await sql`
      UPDATE system_state
      SET is_paused = NOT is_paused
      WHERE id = 1
      RETURNING is_paused
    `;
    return result.rows[0].is_paused;
  } catch (error) {
    console.error("Error toggling pause state:", error);
    throw new Error("Failed to toggle pause state");
  }
}

export async function getPauseState() {
  try {
    const result = await sql`
      SELECT is_paused FROM system_state WHERE id = 1
    `;
    return result.rows[0].is_paused;
  } catch (error) {
    console.error("Error getting pause state:", error);
    throw new Error("Failed to get pause state");
  }
}

export async function searchSpotify(query: string) {
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    // First, get the access token
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(client_id + ":" + client_secret).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to obtain Spotify access token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Now use the access token to search
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error("Failed to fetch from Spotify API");
    }

    const data = await searchResponse.json();
    return data.tracks.items.map((track: SpotifyTrack) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: SpotifyArtist) => ({
        name: artist.name,
      })),
      preview_url: track.preview_url,
    }));
  } catch (error) {
    console.error("Error searching Spotify:", error);
    throw new Error("Failed to search Spotify");
  }
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  preview_url: string | null;
}

interface SpotifyArtist {
  name: string;
}
