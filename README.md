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
    audio_url TEXT NOT NULL,
    photo_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_state (
    id SERIAL PRIMARY KEY,
    is_paused BOOLEAN NOT NULL
);

INSERT INTO system_state (id, is_paused) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS entrances (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Resetting database:

```
DROP TABLE IF EXISTS users
DROP TABLE IF EXISTS system_state
DROP TABLE IF EXISTS entrances
```

