# Dohr

## Features

- Continuous photo capture (every 5 seconds)
- AI-powered face recognition
- Customized audio playback based on identification
- Web interface for user registration and admin controls
- Notification system

## Getting started

```bash
npm i
vercel env pull .env.development.local
npm run dev
```

## Setting up database

```
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    audio_uri TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    track_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system (
    id SERIAL PRIMARY KEY,
    is_paused BOOLEAN NOT NULL,
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    spotify_token_expiry BIGINT
);

INSERT INTO system (id, is_paused) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS entrances (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Resetting database:

```
DROP TABLE IF EXISTS users
DROP TABLE IF EXISTS system
DROP TABLE IF EXISTS entrances
```

