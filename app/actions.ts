"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  try {
    const result = await sql`
      SELECT id, name, audio_url, photo_url, track_name FROM users
    `;
    return result.rows;
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

export async function notifyAdmin(message: string) {
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  const TELEGRAM_API_TOKEN = process.env.TELEGRAM_API_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  // Send Slack message
  if (SLACK_WEBHOOK_URL) {
    try {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });
      if (response.ok) {
        console.log(`Slack notification sent: ${message}`);
      } else {
        console.error(
          `Failed to send Slack notification: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to send Slack notification:", error);
    }
  } else {
    console.log("Slack webhook URL not set. Skipping Slack notification.");
  }

  // Send Telegram message
  if (TELEGRAM_API_TOKEN && TELEGRAM_CHAT_ID) {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage`;
    try {
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
        }),
      });
      if (response.ok) {
        console.log(`Telegram notification sent: ${message}`);
      } else {
        console.error(
          `Failed to send Telegram notification: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
    }
  } else {
    console.log(
      "Telegram API token or chat ID not set. Skipping Telegram notification."
    );
  }
}

export async function registerUser(
  name: string,
  photo_url: string,
  audio_url: string,
  track_name: string
) {
  try {
    await sql`
      INSERT INTO users (name, audio_url, photo_url, track_name)
      VALUES (${name}, ${audio_url}, ${photo_url}, ${track_name})
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

export async function getEntrances() {
  try {
    const result = await sql`
      SELECT name, timestamp FROM entrances
      WHERE timestamp > NOW() - INTERVAL '1 day'
      ORDER BY timestamp DESC
    `;
    return result.rows;
  } catch (error) {
    console.error("Error fetching entrances:", error);
    throw new Error("Failed to fetch entrances");
  }
}

export async function registerEntrance(name: string) {
  try {
    // Check if the person has entered today
    const existingEntry = await sql`
      SELECT * FROM entrances
      WHERE name = ${name} AND timestamp > NOW() - INTERVAL '1 day'
    `;

    if (existingEntry.rowCount === 0) {
      // If not, record the entrance
      await sql`
        INSERT INTO entrances (name) VALUES (${name})
      `;
      return true; // Indicate that this is a new entry
    }

    return false; // Indicate that this person has already entered today
  } catch (error) {
    console.error("Error registering entrance:", error);
    throw new Error("Failed to register entrance");
  }
}
