# Dohr

This project implements an AI-powered doorbell system using a Raspberry Pi, camera, and speaker. The system captures photos, uses AI for image recognition, and plays customized audio responses based on the identified individual.

## Features

- Continuous photo capture (every 5 seconds)
- AI-powered face recognition
- Customized audio playback based on identification
- Web interface for user registration and admin controls
- Basic notification system

## Installation

1. Install the required packages:

   ```
   pip install -r requirements.txt
   ```
2. Add your GPT-4 Vision API key to a `.env` file in the root directory of the project.
3. Run the main script:

    ```
    python main.py
    ```

## Resetting the Database

If you need to reset the database and start fresh, you can use the `reset.py` script:

```
python reset.py
```
