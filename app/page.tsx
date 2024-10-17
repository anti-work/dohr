"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { type PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";
import {
  getUsers,
  removeUser,
  registerUser,
  togglePause,
  getPauseState,
  searchSpotify,
} from "./actions";

interface User {
  id: number;
  name: string;
  audio_url: string;
  photo_url: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  preview_url: string;
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
  const [photoBlob, setPhotoBlob] = useState<PutBlobResult | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
    fetchPauseState();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
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

    if (!photoBlob) {
      alert("Please upload a photo");
      return;
    }

    try {
      await registerUser(name, photoBlob.url, audioUrl);
      fetchUsers();
      setSelectedTrack(null);
      setSearchQuery("");
      setSearchResults([]);
      setAudioUrl("");
      setPhotoBlob(null);
      if (inputFileRef.current) {
        inputFileRef.current.value = "";
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

    setPhotoBlob(newBlob);
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
        {photoBlob && (
          <div>
            Uploaded photo: <a href={photoBlob.url}>{photoBlob.url}</a>
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
        <input type="hidden" name="photo_url" value={photoBlob?.url || ""} />
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Register
        </button>
      </form>

      <h2 className="text-xl font-semibold mt-8 mb-4">Registered Users</h2>
      <ul className="space-y-4">
        {users.map((user) => (
          <li key={user.id} className="flex items-center space-x-4">
            <Image
              src={user.photo_url}
              alt={user.name}
              width={50}
              height={50}
              className="rounded-full object-cover"
            />
            <span>{user.name}</span>
            <audio controls>
              <source src={user.audio_url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <button
              onClick={() => handleRemoveUser(user.id)}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
