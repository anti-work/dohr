import time
import cv2
import requests
import pygame
import sqlite3
from flask import Flask, request, jsonify, render_template
from threading import Thread, Event
import base64
import os
from dotenv import load_dotenv
import socket

# Load environment variables
load_dotenv()

# Initialize camera
camera = cv2.VideoCapture(0)

# Initialize pygame for audio playback
pygame.mixer.init()

# Initialize Flask app
app = Flask(__name__)

# Database setup
conn = sqlite3.connect('doorbell.db', check_same_thread=False)
cursor = conn.cursor()

# Create users table if not exists
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        audio_file TEXT,
        photo BLOB
    )
''')
conn.commit()

# Add a new table for system state
cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_state (
        id INTEGER PRIMARY KEY,
        is_paused BOOLEAN NOT NULL
    )
''')
conn.commit()

# Initialize system state
cursor.execute("INSERT OR IGNORE INTO system_state (id, is_paused) VALUES (1, 0)")
conn.commit()

# Load the pre-trained face detection classifier
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Add an event for pausing
pause_event = Event()

def capture_photo():
    ret, frame = camera.read()
    if ret:
        cv2.imwrite('latest_capture.jpg', frame)
        return frame, 'latest_capture.jpg'
    return None, None

def detect_face(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    return len(faces) > 0

def recognize_person(image_path):
    api_url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.getenv('GPT4_VISION_API_KEY')}",
        "Content-Type": "application/json"
    }

    # Fetch all user photos from the database
    cursor.execute("SELECT name, photo FROM users")
    users = cursor.fetchall()

    # Prepare the content for the API request
    content = [
        {"type": "text", "text": "Who is in these images? Is there any match between the first image and the rest?"}
    ]

    # Add the captured image
    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}})

    # Add user photos
    for user in users:
        name, photo = user
        base64_user_photo = base64.b64encode(photo).decode('utf-8')
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_user_photo}"}})

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ],
        "max_tokens": 300
    }

    response = requests.post(api_url, headers=headers, json=payload)
    result = response.json()

    print(result)

    # Process the result to extract the person's name
    # You'll need to parse the actual API response to determine if there's a match
    recognized_name = result['choices'][0]['message']['content']
    return recognized_name

def play_audio(audio_file):
    pygame.mixer.music.load(audio_file)
    pygame.mixer.music.play()

def notify_admin(message):
    # Placeholder for admin notification system
    # You can implement email, SMS, or push notifications here
    print(f"Admin Notification: {message}")

def doorbell_loop():
    while True:
        if not pause_event.is_set():
            frame, image_path = capture_photo()
            if frame is not None and image_path is not None:
                if detect_face(frame):
                    recognized_name = recognize_person(image_path)
                    cursor.execute("SELECT audio_file FROM users WHERE name = ?", (recognized_name,))
                    result = cursor.fetchone()
                    if result:
                        audio_file = result[0]
                        play_audio(audio_file)
                    else:
                        play_audio("default_chime.mp3")
                        notify_admin(f"Unrecognized person at the door: {recognized_name}")
                else:
                    print("No face detected in the image")
        time.sleep(5)

# Start the doorbell loop in a separate thread
doorbell_thread = Thread(target=doorbell_loop)
doorbell_thread.start()

# Flask routes for web interface
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register_user():
    data = request.json
    name = data['name']
    audio_file = data['audio_file']
    photo = base64.b64decode(data['photo'])

    cursor.execute("INSERT INTO users (name, audio_file, photo) VALUES (?, ?, ?)",
                   (name, audio_file, photo))
    conn.commit()
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/users', methods=['GET'])
def get_users():
    cursor.execute("SELECT id, name, audio_file FROM users")
    users = cursor.fetchall()
    return jsonify([{"id": user[0], "name": user[1], "audio_file": user[2]} for user in users])

@app.route('/toggle_pause', methods=['POST'])
def toggle_pause():
    cursor.execute("SELECT is_paused FROM system_state WHERE id = 1")
    current_state = cursor.fetchone()[0]
    new_state = not current_state
    cursor.execute("UPDATE system_state SET is_paused = ? WHERE id = 1", (new_state,))
    conn.commit()

    if new_state:
        pause_event.set()
    else:
        pause_event.clear()

    return jsonify({"is_paused": new_state}), 200

@app.route('/get_pause_state', methods=['GET'])
def get_pause_state():
    cursor.execute("SELECT is_paused FROM system_state WHERE id = 1")
    is_paused = cursor.fetchone()[0]
    return jsonify({"is_paused": is_paused}), 200

def find_free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('', 0))
    port = sock.getsockname()[1]
    sock.close()
    return port

if __name__ == '__main__':
    # Check the initial pause state
    cursor.execute("SELECT is_paused FROM system_state WHERE id = 1")
    is_paused = cursor.fetchone()[0]
    if is_paused:
        pause_event.set()
    else:
        pause_event.clear()

    port = find_free_port()
    print(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port)
