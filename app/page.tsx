"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getUsers, removeUser, registerUser, togglePause, getPauseState } from "./actions";

export default function Home() {
  const [users, setUsers] = useState([]);
  const [isPaused, setIsPaused] = useState(false);

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
    const name = formData.get('name') as string;
    const photo = formData.get('photo') as File;
    const audio = formData.get('audio') as File;

    const photoBase64 = await fileToBase64(photo);
    const audioBase64 = await fileToBase64(audio);

    try {
      await registerUser(name, photoBase64, audioBase64);
      fetchUsers();
    } catch (error) {
      console.error("Error registering user:", error);
      alert("Error registering user");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dohr Admin</h1>
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
          <input type="text" id="name" name="name" required className="border p-2 w-full" />
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
          />
        </div>
        <div>
          <label htmlFor="audio" className="block">
            Audio:
          </label>
          <input
            type="file"
            id="audio"
            name="audio"
            accept="audio/*"
            required
            className="border p-2 w-full"
          />
        </div>
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
              src={`data:image/jpeg;base64,${user.photo}`}
              alt={user.name}
              width={50}
              height={50}
              className="rounded-full object-cover"
            />
            <span>{user.name}</span>
            <audio controls>
              <source
                src={`data:audio/mpeg;base64,${user.audio}`}
                type="audio/mpeg"
              />
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
