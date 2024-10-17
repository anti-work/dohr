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
    audio BYTEA,
    photo BYTEA,
    face_encoding BYTEA
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

