"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

export async function getUsers() {
  try {
    const result = await sql`
      SELECT id, name, audio_uri, photo_url, track_name FROM users
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
  audio_uri: string,
  track_name: string
) {
  try {
    await sql`
      INSERT INTO users (name, audio_uri, photo_url, track_name)
      VALUES (${name}, ${audio_uri}, ${photo_url}, ${track_name})
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
      UPDATE systems
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
      SELECT is_paused FROM systems WHERE id = 1
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
      uri: track.uri,
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
  uri: string;
}

interface SpotifyArtist {
  name: string;
}

export async function getEntrances() {
  try {
    const result = await sql`
      SELECT id, name, timestamp FROM entrances
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
    const existingEntry = await sql`
      SELECT * FROM entrances
      WHERE name = ${name} AND timestamp > NOW() - INTERVAL '1 day'
    `;

    if (existingEntry.rowCount === 0) {
      await sql`
        INSERT INTO entrances (name) VALUES (${name})
      `;
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error registering entrance:", error);
    throw new Error("Failed to register entrance");
  }
}

export async function addToQueue(trackUri: string) {
  try {
    const result = await sql`
      SELECT spotify_access_token, spotify_refresh_token, spotify_token_expiry, spotify_device_id FROM systems WHERE id = 1
    `;
    let accessToken = result.rows[0].spotify_access_token;
    const refreshToken = result.rows[0].spotify_refresh_token;
    const tokenExpiry = result.rows[0].spotify_token_expiry;
    const deviceId = result.rows[0].spotify_device_id;

    if (!accessToken || !refreshToken) {
      throw new Error("No Spotify tokens found");
    }

    // Check if the access token is expired and refresh if necessary
    if (Date.now() > tokenExpiry) {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;
    }

    // Check if playback is active
    const playbackStateResponse = await fetch(
      "https://api.spotify.com/v1/me/player",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!playbackStateResponse.ok) {
      throw new Error("Failed to get playback state");
    }

    const playbackState = await playbackStateResponse.json();

    // If no active device, transfer playback to the device on file
    if (!playbackState.is_playing) {
      const transferResponse = await fetch(
        "https://api.spotify.com/v1/me/player",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_ids: [deviceId],
            play: true,
          }),
        }
      );

      if (!transferResponse.ok) {
        throw new Error("Failed to transfer playback");
      }

      console.log("Playback transferred to device on file");
    }

    // Add track to queue
    const queueResponse = await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(
        trackUri
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!queueResponse.ok) {
      console.log(queueResponse);
      throw new Error("Failed to add track to Spotify queue");
    }

    console.log(`Track ${trackUri} added to queue successfully`);

    // Skip to next track to instantly play the added song
    const skipResponse = await fetch(
      "https://api.spotify.com/v1/me/player/next",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!skipResponse.ok) {
      throw new Error("Failed to skip to next track");
    }

    console.log("Skipped to next track successfully");
  } catch (error) {
    console.error("Error in Spotify queue operation:", error);
    throw new Error("Failed to perform Spotify queue operation");
  }
}

export async function removeEntrance(id: number) {
  try {
    await sql`
      DELETE FROM entrances
      WHERE id = ${id}
    `;
    revalidatePath("/");
    return true;
  } catch (error) {
    console.error("Error removing entrance:", error);
    throw new Error("Failed to remove entrance");
  }
}

export async function getSpotifyAuthUrl() {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const scope = "user-read-playback-state user-modify-playback-state";

  const state = Math.random().toString(36).substring(7);

  let redirect_uri;
  if (process.env.VERCEL_ENV === "production") {
    redirect_uri = "https://dohr.com/api/spotify/callback";
  } else if (process.env.VERCEL_ENV === "preview") {
    redirect_uri = `https://${process.env.VERCEL_URL}/api/spotify/callback`;
  } else {
    redirect_uri = "http://localhost:3000/api/spotify/callback";
  }

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", client_id!);
  authUrl.searchParams.append("scope", scope);
  authUrl.searchParams.append("redirect_uri", redirect_uri);
  authUrl.searchParams.append("state", state);

  return authUrl.toString();
}

export async function exchangeCodeForTokens(code: string) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  let redirect_uri;
  if (process.env.VERCEL_ENV === "production") {
    redirect_uri = "https://dohr.com/api/spotify/callback";
  } else if (process.env.VERCEL_ENV === "preview") {
    redirect_uri = `https://${process.env.VERCEL_URL}/api/spotify/callback`;
  } else {
    redirect_uri = "http://localhost:3000/api/spotify/callback";
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    body: new URLSearchParams({
      code: code,
      redirect_uri: redirect_uri!,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();

  // Save tokens to the database
  await sql`
    UPDATE systems
    SET spotify_access_token = ${data.access_token},
        spotify_refresh_token = ${data.refresh_token},
        spotify_token_expiry = ${Date.now() + data.expires_in * 1000}
    WHERE id = 1
  `;

  return data;
}

export async function refreshAccessToken(refresh_token: string) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  const data = await response.json();

  // Update the access token and expiry in the database
  await sql`
    UPDATE systems
    SET spotify_access_token = ${data.access_token},
        spotify_token_expiry = ${Date.now() + data.expires_in * 1000}
    WHERE id = 1
  `;

  return data;
}

// Add these new functions

export async function getSpotifyDevices() {
  try {
    const result = await sql`
      SELECT spotify_access_token, spotify_refresh_token, spotify_token_expiry FROM systems WHERE id = 1
    `;
    let accessToken = result.rows[0].spotify_access_token;
    const refreshToken = result.rows[0].spotify_refresh_token;
    const tokenExpiry = result.rows[0].spotify_token_expiry;

    if (!accessToken || !refreshToken) {
      throw new Error("No Spotify tokens found");
    }

    // Check if the access token is expired and refresh if necessary
    if (Date.now() > tokenExpiry) {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;
    }

    const response = await fetch(
      "https://api.spotify.com/v1/me/player/devices",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Spotify devices");
    }

    const data = await response.json();
    return data.devices.map((device: SpotifyDevice) => ({
      id: device.id,
      name: device.name,
    }));
  } catch (error) {
    console.error("Error fetching Spotify devices:", error);
    throw new Error("Failed to fetch Spotify devices");
  }
}

interface SpotifyDevice {
  id: string;
  name: string;
}

export async function setSpotifyDevice(deviceId: string) {
  try {
    const result = await sql`
      SELECT spotify_access_token, spotify_refresh_token, spotify_token_expiry FROM systems WHERE id = 1
    `;
    let accessToken = result.rows[0].spotify_access_token;
    const refreshToken = result.rows[0].spotify_refresh_token;
    const tokenExpiry = result.rows[0].spotify_token_expiry;

    if (!accessToken || !refreshToken) {
      throw new Error("No Spotify tokens found");
    }

    // Check if the access token is expired and refresh if necessary
    if (Date.now() > tokenExpiry) {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;
    }

    const response = await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device_ids: [deviceId] }),
    });

    if (!response.ok) {
      throw new Error("Failed to set Spotify device");
    }

    // Update the device ID in the database
    await sql`
      UPDATE systems
      SET spotify_device_id = ${deviceId}
      WHERE id = 1
    `;

    return true;
  } catch (error) {
    console.error("Error setting Spotify device:", error);
    throw new Error("Failed to set Spotify device");
  }
}

// Add this new function at the end of the file
export async function getSystems() {
  try {
    const result = await sql`
      SELECT name, slug FROM systems
      ORDER BY name ASC
    `;
    return result.rows;
  } catch (error) {
    console.error("Error fetching systems:", error);
    throw new Error("Failed to fetch systems");
  }
}

// Add this new function at the end of the file
export async function generateAndPlayAudio(message: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: message,
    });

    const arrayBuffer = await mp3.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    return base64Audio;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw new Error("Failed to generate audio");
  }
}
