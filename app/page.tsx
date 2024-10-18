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
  getEntrances,
  registerEntrance,
  addToQueue,
  removeEntrance,
  getSpotifyAuthUrl,
} from "./actions";

interface User {
  id: number;
  name: string;
  audio_uri: string;
  photo_url: string;
  track_name: string;
}

interface Entrance {
  id: number;
  name: string;
  timestamp: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  preview_url: string;
  uri: string;
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
  const [audioUri, setAudioUri] = useState<string>("");
  const [showSearchResults, setShowSearchResults] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [entrances, setEntrances] = useState<
    { name: string; timestamp: string; id: number }[]
  >([]);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchPauseState();
    fetchEntrances();
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
      timestamp: new Date().toISOString(),
      message: message,
    };
    setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 10)); // Keep only the last 10 logs
  };

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      videoRef.current.addEventListener("play", () => {
        loadFaceMatcher();

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

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );

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

              for (const detection of resizedDetections) {
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
                      const isNewEntry = await registerEntrance(
                        matchedUser.name
                      );
                      if (isNewEntry) {
                        // Add the user's track to the Spotify queue
                        await addToQueue(matchedUser.audio_uri);
                        const message = `${matchedUser.name} is in the building!`;
                        notifyAdmin(message);
                        addLog(message);
                        fetchEntrances(); // Refresh the entrances list
                      } else {
                        console.log(
                          `${matchedUser.name} has already entered today. Skipping notification.`
                        );
                      }
                    }
                  } else {
                    const audio = new Audio("/default_chime.mp3");
                    audio.play();
                    console.log("Unknown person at the door");
                  }
                }
              }
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

    if (!audioUri) {
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
        await registerUser(name, photoUrl, audioUri, selectedTrack.name);
        fetchUsers();
        setSelectedTrack(null);
        setSearchQuery("");
        setSearchResults([]);
        setAudioUri("");
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
    setAudioUri(track.uri);
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

  const handleCapturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], "captured_photo.jpg", {
            type: "image/jpeg",
          });
          const newBlob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/avatar/upload",
          });
          setPhotoUrl(newBlob.url);
        }
      }, "image/jpeg");
    }
  };

  const fetchEntrances = async () => {
    try {
      const data = await getEntrances();
      setEntrances(data as Entrance[]);
    } catch (error) {
      console.error("Error fetching entrances:", error);
    }
  };

  const handleRemoveEntrance = async (id: number) => {
    try {
      await removeEntrance(id);
      fetchEntrances(); // Refresh the entrances list
    } catch (error) {
      console.error("Error removing entrance:", error);
      alert("Error removing entrance");
    }
  };

  const handleSpotifyAuth = async () => {
    const authUrl = await getSpotifyAuthUrl();
    window.location.href = authUrl;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dohr</h1>
      <button
        onClick={handleTogglePause}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
      >
        {isPaused ? "Unpause" : "Pause"}
      </button>
      <button
        onClick={handleSpotifyAuth}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Connect Spotify
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
            className="border p-2 w-full"
            ref={inputFileRef}
            onChange={handlePhotoUpload}
          />
          <button
            type="button"
            onClick={handleCapturePhoto}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
          >
            Capture Photo
          </button>
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
            <p>{selectedTrack.uri}</p>
          </div>
        )}
        <input type="hidden" name="audio_uri" value={audioUri || ""} />
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

      <h2 className="text-xl font-semibold mt-8 mb-4">
        Today&apos;s Entrances
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Timestamp</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {entrances.map((entrance) => (
            <tr key={entrance.id} className="border-b">
              <td className="p-2">{entrance.name}</td>
              <td className="p-2">
                {new Date(entrance.timestamp).toLocaleString()}
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleRemoveEntrance(entrance.id)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
