# AI-Powered Doorbell System

This project implements an AI-powered doorbell system using a Raspberry Pi, camera, and speaker. The system captures photos, uses AI for image recognition, and plays customized audio responses based on the identified individual.

## Features

- Continuous photo capture (every 5 seconds)
- AI-powered image recognition using GPT-4 Vision API
- Customized audio playback based on identification
- Web interface for user registration and admin controls
- Basic notification system for admins

## Components

- Raspberry Pi OS
- Python environment
- OpenCV for image capture and processing
- GPT-4 Vision API for image recognition
- Pygame for audio playback
- Flask for hosting the admin interface
- SQLite database for storing user information and preferences

## Installation

1. Clone this repository to your Raspberry Pi.
2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```
3. Add your GPT-4 Vision API key to a `.env` file in the root directory of the project.

## Usage

Run the main script:

```
python main.py
```