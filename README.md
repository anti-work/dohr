# Dohr

This project implements an AI-powered doorbell system using a camera and speaker.

## Features

- Continuous photo capture (every 5 seconds)
- AI-powered face recognition
- Customized audio playback based on identification
- Web interface for user registration and admin controls
- Basic notification system

## Installation

1. Install the required packages:

   ```
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Run the main script:

    ```
    python main.py
    ```

### Debugging

If you get a dlib-related error, it may be that the system is trying to load a library file (_dlib_pybind11.cpython-39-darwin.so) that was compiled for x86_64 architecture, but your system needs an ARM64 version.

Run this to fix:

```
pip uninstall dlib face_recognition
brew install cmake
git clone https://github.com/davisking/dlib.git
cd dlib
pip install . # or python setup.py install
pip install face_recognition
```

## Resetting the Database

If you need to reset the database and start fresh, you can use the `reset.py` script:

```
python reset.py
```
