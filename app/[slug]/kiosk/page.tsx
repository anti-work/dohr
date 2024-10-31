"use client";

import { useState } from "react";
import { Webcam } from "@/components/Webcam";
import { RegisterUserModal } from "@/components/RegisterUserModal";
import { upload } from "@vercel/blob/client";

export default function KioskPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <Webcam fullscreen onCapture={handleCapture} />
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
