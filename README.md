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

# Raspberry Pi Camera as Webcam Setup Guide

This guide explains how to set up your Raspberry Pi camera module to work as a webcam in Chrome and other browsers.

## Prerequisites

- Raspberry Pi (tested on Raspberry Pi 5)
- Raspberry Pi Camera Module
- Raspberry Pi OS (Debian 12-based version)

## Installation

1. Install required packages:
```bash
sudo apt-get update
sudo apt-get install v4l2loopback-dkms ffmpeg v4l-utils
```

2. Load the v4l2loopback module with correct parameters:
```bash
sudo modprobe -r v4l2loopback
sudo modprobe v4l2loopback exclusive_caps=1 max_buffers=2 max_width=1280 max_height=720 card_label="WebcamFeed"
```

3. To make the module load automatically on boot, create this file:
```bash
sudo nano /etc/modprobe.d/v4l2loopback.conf
```

Add this line to the file:
```
options v4l2loopback exclusive_caps=1 max_buffers=2 max_width=1280 max_height=720 card_label="WebcamFeed"
```

4. Add the module to load at boot:
```bash
echo "v4l2loopback" | sudo tee -a /etc/modules
```

## Starting the Webcam

Run this command to start the camera feed:
```bash
libcamera-vid -t 0 --width 640 --height 480 --framerate 15 --codec yuv420 -n -o - | \
ffmpeg -nostats -hide_banner \
-f rawvideo -pixel_format yuv420p \
-video_size 640x480 -framerate 15 -i - \
-vf format=yuyv422 \
-f v4l2 -pix_fmt yuyv422 \
/dev/video8
```

## Make it Run as a Service

1. Create a systemd service file:
```bash
sudo nano /etc/systemd/system/webcam-bridge.service
```

2. Add this content (replace YOUR_USERNAME with your actual username):
```ini
[Unit]
Description=Webcam Bridge Service
After=network.target

[Service]
ExecStart=/bin/bash -c 'libcamera-vid -t 0 --width 640 --height 480 --framerate 15 --codec yuv420 -n -o - | ffmpeg -nostats -hide_banner -f rawvideo -pixel_format yuv420p -video_size 640x480 -framerate 15 -i - -vf format=yuyv422 -f v4l2 -pix_fmt yuyv422 /dev/video8'
Restart=always
RestartSec=3
User=YOUR_USERNAME

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:
```bash
sudo systemctl enable webcam-bridge
sudo systemctl start webcam-bridge
```

## Troubleshooting

1. Check if the v4l2loopback module is loaded:
```bash
lsmod | grep v4l2loopback
```

2. List available video devices:
```bash
v4l2-ctl --list-devices
```

3. Monitor service logs:
```bash
sudo journalctl -u webcam-bridge -f
```

4. If the camera isn't working in Chrome:
- Check chrome://settings/content/camera
- Make sure Chrome has permission to access the camera
- Restart Chrome after starting the webcam service

## Notes

- The current setup uses 640x480 resolution at 15fps for stability
- You can modify the resolution and framerate in both the libcamera-vid and ffmpeg commands if your system can handle it
- The camera feed will be available as "WebcamFeed" in Chrome's camera selection

