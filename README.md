# Dohr

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

CREATE TABLE IF NOT EXISTS systems (
    id SERIAL PRIMARY KEY,
    is_paused BOOLEAN NOT NULL,
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    spotify_token_expiry BIGINT,
    spotify_device_id TEXT,
    name TEXT,
    slug TEXT,
    pin TEXT
);

INSERT INTO systems (id, is_paused, name, slug, pin) VALUES (1, false, "Antiwork", "antiwork", 0825) ON CONFLICT (id) DO NOTHING;

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

