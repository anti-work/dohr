import time
import cv2
import pygame
import sqlite3
from flask import Flask, request, jsonify, render_template
from threading import Thread, Event
import base64
import os
import socket
from contextlib import contextmanager
import face_recognition
import numpy as np
import io
import requests
from dotenv import load_dotenv

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
        audio BLOB,
        photo BLOB,
        face_encoding BLOB
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

# Add an event for pausing
pause_event = Event()

# Fetch all user face encodings from the database
with get_db_cursor() as cursor:
    cursor.execute("SELECT name, face_encoding FROM users")
    known_faces = cursor.fetchall()

known_face_names = [face[0] for face in known_faces]
known_face_encodings = [np.frombuffer(face[1], dtype=np.float64) for face in known_faces]

def capture_photo():
    ret, frame = camera.read()
    if ret:
        cv2.imwrite('latest_capture.jpg', frame)
        return frame, 'latest_capture.jpg'
    return None, None

def recognize_person(frame):
    # Resize frame of video to 1/4 size for faster face recognition processing
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)

    # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    # Find all the face locations in the current frame of video
    face_locations = face_recognition.face_locations(rgb_small_frame)
    print(f"Face locations: {face_locations}")

    if not face_locations:
        print("No faces detected in the frame")
        return "No one"

    try:
        # Find all the face encodings in the current frame of video
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
    except Exception as e:
        print(f"Error computing face encodings: {e}")
        print(f"Frame shape: {rgb_small_frame.shape}")
        print(f"Frame dtype: {rgb_small_frame.dtype}")
        print(f"Face locations: {face_locations}")

        # Try to compute face landmarks for debugging
        try:
            landmarks = face_recognition.face_landmarks(rgb_small_frame, face_locations)
            print(f"Face landmarks: {landmarks}")
        except Exception as le:
            print(f"Error computing face landmarks: {le}")

        return "Unknown"

    if not face_encodings:
        print("No face encodings could be computed")
        return "Unknown"

    face_names = []
    for face_encoding in face_encodings:
        # See if the face is a match for the known face(s)
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
        name = "Unknown"

        print(f"Face matches: {matches}")

        # Use the known face with the smallest distance to the new face
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            name = known_face_names[best_match_index]

        face_names.append(name)

    print(f"Known face names: {known_face_names}")
    print(f"Detected face names: {face_names}")

    return face_names[0] if face_names else "Unknown"

def play_audio(audio_data):
    temp_file = 'temp_audio.mp3'
    with open(temp_file, 'wb') as f:
        f.write(audio_data)
    pygame.mixer.music.load(temp_file)
    pygame.mixer.music.play()
    os.remove(temp_file)

def notify_admin(message):
    print(f"Admin Notification: {message}")

    # Send Slack message
    if SLACK_WEBHOOK_URL:
        payload = {"text": message}
        try:
            response = requests.post(SLACK_WEBHOOK_URL, json=payload)
            response.raise_for_status()
            print(f"Slack notification sent: {message}")
        except requests.RequestException as e:
            print(f"Failed to send Slack notification: {e}")
    else:
        print("Slack webhook URL not set. Skipping Slack notification.")

def doorbell_loop():
    while True:
        if not pause_event.is_set():
            frame, image_path = capture_photo()
            if frame is not None and image_path is not None:
                recognized_name = recognize_person(frame)
                if recognized_name != "No one":
                    if recognized_name != "Unknown":
                        with get_db_cursor() as cursor:
                            cursor.execute("SELECT audio FROM users WHERE name = ?", (recognized_name,))
                            result = cursor.fetchone()
                        if result:
                            audio_data = result[0]
                            play_audio(audio_data)
                            notify_admin(f"{recognized_name} is in the building!")
                        else:
                            with open("default_chime.mp3", "rb") as f:
                                default_audio = f.read()
                            play_audio(default_audio)
                            notify_admin("Unrecognized person at the door")
                    else:
                        with open("default_chime.mp3", "rb") as f:
                            default_audio = f.read()
                        play_audio(default_audio)
                        notify_admin("Unknown person at the door")
                else:
                    notify_admin("No one at the door")
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

    # Generate face encoding
    image = face_recognition.load_image_file(io.BytesIO(photo))
    face_encoding = face_recognition.face_encodings(image)[0]

    with get_db_cursor() as cursor:
        cursor.execute("INSERT INTO users (name, audio, photo, face_encoding) VALUES (?, ?, ?, ?)",
                       (name, audio, photo, face_encoding.tobytes()))
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/users', methods=['GET'])
def get_users():
    with get_db_cursor() as cursor:
        cursor.execute("SELECT id, name, audio, photo FROM users")
        users = cursor.fetchall()
    return jsonify([{"id": user[0], "name": user[1], "audio": base64.b64encode(user[2]).decode('utf-8'), "photo": base64.b64encode(user[3]).decode('utf-8')} for user in users])

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
