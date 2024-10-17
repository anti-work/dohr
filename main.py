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
    # Send Slack message
    SLACK_WEBHOOK_URL = os.getenv('SLACK_WEBHOOK_URL')
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

    # Send Telegram message
    TELEGRAM_API_TOKEN = os.getenv('TELEGRAM_API_TOKEN')
    TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')
    if TELEGRAM_API_TOKEN and TELEGRAM_CHAT_ID:
        telegram_url = f"https://api.telegram.org/bot{TELEGRAM_API_TOKEN}/sendMessage"
        telegram_payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message
        }
        try:
            response = requests.post(telegram_url, json=telegram_payload)
            response.raise_for_status()
            print(f"Telegram notification sent: {message}")
        except requests.RequestException as e:
            print(f"Failed to send Telegram notification: {e}")
    else:
        print("Telegram API token or chat ID not set. Skipping Telegram notification.")

def doorbell_loop():
    while True:
        frame, image_path = capture_photo()
        if frame is not None and image_path is not None:
            recognized_name = recognize_person(frame)
            if recognized_name != "No one":
                if recognized_name != "Unknown":
                    with get_db_cursor() as cursor:
                        # Check if the person has entered today
                        cursor.execute("SELECT * FROM entrances WHERE name = ? AND timestamp > ?",
                                       (recognized_name, datetime.now() - timedelta(days=1)))
                        if not cursor.fetchone():
                            # If not, play audio and notify
                            cursor.execute("SELECT audio FROM users WHERE name = ?", (recognized_name,))
                            result = cursor.fetchone()
                            if result:
                                audio_data = result[0]
                                play_audio(audio_data)
                                notify_admin(f"{recognized_name} is in the building!")
                                # Record the entrance
                                cursor.execute("INSERT INTO entrances (name) VALUES (?)", (recognized_name,))
                        else:
                            print(f"{recognized_name} has already entered today. Skipping notification.")
                else:
                    with open("default_chime.mp3", "rb") as f:
                        default_audio = f.read()
                    play_audio(default_audio)
                    notify_admin("Unknown person at the door")
            else:
                print("No one at the door")
        time.sleep(5)

