"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
import * as faceapi from "face-api.js";
import {
  getUsers,
  removeUser,
  registerUser,
  togglePause,
  getPauseState,
  searchSpotify,
  notifyAdmin,
} from "./actions";

interface User {
  id: number;
  name: string;
  audio_url: string;
  photo_url: string;
  track_name: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  preview_url: string;
}

interface Log {
  timestamp: string;
  message: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [showSearchResults, setShowSearchResults] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [logs, setLogs] = useState<Log[]>([]);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchPauseState();
    loadFaceMatcher();
    startVideo();
  }, []);

  const loadFaceMatcher = async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

    const labeledDescriptors = await Promise.all(
      users.map(async (user) => {
        const img = await faceapi.fetchImage(user.photo_url);
        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        return new faceapi.LabeledFaceDescriptors(
          user.name,
          detection ? [detection.descriptor] : []
        );
      })
    );

    if (labeledDescriptors.length > 0) {
      faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptors);
    }
  };

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error(err));
  };

  const addLog = (message: string) => {
    const newLog: Log = {
      timestamp: new Date().toLocaleString(),
      message: message,
    };
    setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 10)); // Keep only the last 10 logs
  };

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      videoRef.current.addEventListener("play", () => {
        const displaySize = {
          width: videoRef.current!.width,
          height: videoRef.current!.height,
        };
        faceapi.matchDimensions(canvasRef.current!, displaySize);

        setInterval(async () => {
          if (isPaused) return;

          const detections = await faceapi
            .detectAllFaces(videoRef.current!)
            .withFaceLandmarks()
            .withFaceDescriptors();

          console.log(detections);

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );
          console.log(resizedDetections);

          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              ctx.clearRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
              );
              faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

              resizedDetections.forEach((detection) => {
                if (faceMatcher.current) {
                  const bestMatch = faceMatcher.current.findBestMatch(
                    detection.descriptor
                  );
                  const box = detection.detection.box;
                  const drawOptions = {
                    label: bestMatch.toString(),
                    lineWidth: 2,
                    boxColor: "blue",
                    drawLabelOptions: {
                      anchorPosition: faceapi.draw.AnchorPosition.BOTTOM_LEFT,
                      backgroundColor: "rgba(0, 0, 255, 0.5)",
                    },
                  };
                  new faceapi.draw.DrawBox(box, drawOptions).draw(ctx);

                  if (bestMatch.distance < 0.6) {
                    const matchedUser = users.find(
                      (user) => user.name === bestMatch.label
                    );
                    if (matchedUser) {
                      const audio = new Audio(matchedUser.audio_url);
                      audio.play();
                      const message = `${matchedUser.name} is in the building!`;
                      console.log(message);
                      notifyAdmin(message);
                      addLog(message);
                    }
                  } else {
                    const audio = new Audio("/default_chime.mp3");
                    audio.play();
                    const message = "Unknown person at the door";
                    console.log(message);
                    notifyAdmin(message);
                    addLog(message);
                  }
                }
              });
            }
          }
        }, 300);
      });
    }
  }, [users, isPaused]);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data as User[]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    try {
      await removeUser(userId);
      fetchUsers();
    } catch (error) {
      console.error("Error removing user:", error);
      alert("Error removing user");
    }
  };

  const handleTogglePause = async () => {
    try {
      const newPauseState = await togglePause();
      setIsPaused(newPauseState);
    } catch (error) {
      console.error("Error toggling pause state:", error);
    }
  };

  const fetchPauseState = async () => {
    try {
      const pauseState = await getPauseState();
      setIsPaused(pauseState);
    } catch (error) {
      console.error("Error getting pause state:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    if (!audioUrl) {
      alert("Please select a track");
      return;
    }

    if (!photoUrl) {
      alert("Please upload a photo");
      return;
    }

    if (!selectedTrack) {
      alert("Please select a track");
      return;
    }

    try {
      const img = await faceapi.fetchImage(photoUrl);
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) {
        await registerUser(name, photoUrl, audioUrl, selectedTrack.name);
        fetchUsers();
        setSelectedTrack(null);
        setSearchQuery("");
        setSearchResults([]);
        setAudioUrl("");
        setPhotoUrl("");
        if (inputFileRef.current) {
          inputFileRef.current.value = "";
        }
      } else {
        alert("No face detected in the uploaded photo");
      }
    } catch (error) {
      console.error("Error registering user:", error);
      alert("Error registering user");
    }
  };

  const handleSearch = async () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const newTimeout = setTimeout(async () => {
      const results = await searchSpotify(searchQuery);
      setSearchResults(results);
      setShowSearchResults(true);
    }, 300); // 300ms debounce

    setSearchTimeout(newTimeout);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    handleSearch();
  };

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setAudioUrl(track.preview_url);
    setShowSearchResults(false);
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files) {
      throw new Error("No file selected");
    }

    const file = event.target.files[0];

    const newBlob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/avatar/upload",
    });

    setPhotoUrl(newBlob.url);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dohr</h1>
      <button
        onClick={handleTogglePause}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {isPaused ? "Unpause" : "Pause"}
      </button>

      <div className="relative">
        <video ref={videoRef} width="720" height="560" autoPlay muted></video>
        <canvas
          ref={canvasRef}
          width="720"
          height="560"
          className="absolute top-0 left-0"
        ></canvas>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Register New User</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block">
            Name:
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label htmlFor="photo" className="block">
            Photo:
          </label>
          <input
            type="file"
            id="photo"
            name="photo"
            accept="image/*"
            required
            className="border p-2 w-full"
            ref={inputFileRef}
            onChange={handlePhotoUpload}
          />
        </div>
        {photoUrl && (
          <div>
            Uploaded photo: <a href={photoUrl}>{photoUrl}</a>
          </div>
        )}
        <div>
          <label htmlFor="audio" className="block">
            Audio:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Search for a song"
            className="border p-2 w-full"
          />
        </div>
        {showSearchResults && searchResults.length > 0 && (
          <div>
            <h3 className="font-semibold mt-2">Search Results:</h3>
            <ul>
              {searchResults.map((track) => (
                <li
                  key={track.id}
                  className="cursor-pointer hover:bg-gray-100 p-2"
                  onClick={() => handleTrackSelect(track)}
                >
                  {track.name} - {track.artists.map((a) => a.name).join(", ")}
                  {track.preview_url && (
                    <audio controls className="ml-2">
                      <source src={track.preview_url} type="audio/mpeg" />
                    </audio>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedTrack && (
          <div>
            <h3 className="font-semibold">Selected Track:</h3>
            <p>
              {selectedTrack.name} -{" "}
              {selectedTrack.artists.map((a) => a.name).join(", ")}
            </p>
            {selectedTrack.preview_url && (
              <audio controls className="mt-2">
                <source src={selectedTrack.preview_url} type="audio/mpeg" />
              </audio>
            )}
          </div>
        )}
        <input type="hidden" name="audio_url" value={audioUrl || ""} />
        <input type="hidden" name="photo_url" value={photoUrl || ""} />
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Register
        </button>
      </form>

      <h2 className="text-xl font-semibold mt-8 mb-4">Registered Users</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Photo</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Track</th>
            <th className="p-2 text-left">Audio</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="p-2">
                <Image
                  src={user.photo_url}
                  alt={user.name}
                  width={50}
                  height={50}
                  className="rounded-full object-cover"
                />
              </td>
              <td className="p-2">{user.name}</td>
              <td className="p-2 text-sm text-gray-600">{user.track_name}</td>
              <td className="p-2">
                <audio controls>
                  <source src={user.audio_url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mt-8 mb-4">Logs</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Timestamp</th>
            <th className="p-2 text-left">Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">{log.timestamp}</td>
              <td className="p-2">{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
