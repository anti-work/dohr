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
from contextlib import contextmanager

# Load environment variables
load_dotenv()

# Initialize camera
camera = cv2.VideoCapture(0)

# Initialize pygame for audio playback
pygame.mixer.init()

# Initialize Flask app
app = Flask(__name__)

# Create a new connection for each thread
def get_db_connection():
    return sqlite3.connect('doorbell.db', check_same_thread=False)

@contextmanager
def get_db_cursor():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        yield cursor
        conn.commit()
    finally:
        cursor.close()
        conn.close()

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

def play_audio(audio_data):
    temp_file = 'temp_audio.mp3'
    with open(temp_file, 'wb') as f:
        f.write(audio_data)
    pygame.mixer.music.load(temp_file)
    pygame.mixer.music.play()
    os.remove(temp_file)

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
                    cursor.execute("SELECT audio FROM users WHERE name = ?", (recognized_name,))
                    result = cursor.fetchone()
                    if result:
                        audio_data = result[0]
                        play_audio(audio_data)
                    else:
                        with open("default_chime.mp3", "rb") as f:
                            default_audio = f.read()
                        play_audio(default_audio)
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
    audio = base64.b64decode(data['audio'])
    photo = base64.b64decode(data['photo'])

    with get_db_cursor() as cursor:
        cursor.execute("INSERT INTO users (name, audio, photo) VALUES (?, ?, ?)",
                       (name, audio, photo))
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/users', methods=['GET'])
def get_users():
    with get_db_cursor() as cursor:
        cursor.execute("SELECT id, name, audio FROM users")
        users = cursor.fetchall()
    return jsonify([{"id": user[0], "name": user[1], "audio": base64.b64encode(user[2]).decode('utf-8')} for user in users])

@app.route('/users/<int:user_id>', methods=['DELETE'])
def remove_user(user_id):
    with get_db_cursor() as cursor:
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        if cursor.rowcount > 0:
            return jsonify({"message": "User removed successfully"}), 200
        else:
            return jsonify({"message": "User not found"}), 404

@app.route('/toggle_pause', methods=['POST'])
def toggle_pause():
    with get_db_cursor() as cursor:
        cursor.execute("SELECT is_paused FROM system_state WHERE id = 1")
        current_state = cursor.fetchone()[0]
        new_state = not current_state
        cursor.execute("UPDATE system_state SET is_paused = ? WHERE id = 1", (new_state,))

    if new_state:
        pause_event.set()
    else:
        pause_event.clear()

    return jsonify({"is_paused": new_state}), 200

@app.route('/get_pause_state', methods=['GET'])
def get_pause_state():
    with get_db_cursor() as cursor:
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
    with get_db_cursor() as cursor:
        cursor.execute("SELECT is_paused FROM system_state WHERE id = 1")
        is_paused = cursor.fetchone()[0]
    if is_paused:
        pause_event.set()
    else:
        pause_event.clear()

    port = find_free_port()
    print(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port)
