"use client";

import { useState, useEffect } from "react";
import { Webcam } from "@/components/Webcam";
import { RegisterUserModal } from "@/components/RegisterUserModal";
import { upload } from "@vercel/blob/client";
import { getUsers } from "../../actions";

interface User {
  id: number;
  name: string;
  audio_uri: string;
  photo_url: string;
  track_name: string;
}

export default function KioskPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data as User[]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCapture = async (blob: Blob) => {
    const file = new File([blob], "captured_photo.jpg", {
      type: "image/jpeg",
    });
    const newBlob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/avatar/upload",
    });
    setCapturedPhoto(newBlob.url);
    setIsModalOpen(true);
  };

  return (
    <div className="relative h-screen w-screen">
      <Webcam
        fullscreen
        users={users}
        onCapture={handleCapture}
      />
      <RegisterUserModal
        preloadedPhoto={capturedPhoto || ""}
        onSuccess={() => {
          setCapturedPhoto(null);
          setIsModalOpen(false);
        }}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
