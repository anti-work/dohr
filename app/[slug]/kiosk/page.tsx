"use client";

import { useState } from "react";
import { Webcam } from "@/components/Webcam";
import { RegisterUserModal } from "@/components/RegisterUserModal";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { upload } from "@vercel/blob/client";

export default function KioskPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleCapture = () => {
    const video = document.querySelector("video");
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], "captured_photo.jpg", {
          type: "image/jpeg",
        });
        const newBlob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/avatar/upload",
        });
        setCapturedPhoto(newBlob.url);
        setShowRegisterModal(true);
      }
    }, "image/jpeg");
  };

  return (
    <div className="relative h-screen w-screen">
      <Webcam fullscreen />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Button
          onClick={handleCapture}
          size="lg"
          variant="destructive"
          className="rounded-full text-4xl w-24 h-24 p-0 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Camera className="h-24 w-24" />
        </Button>
      </div>
      {showRegisterModal && capturedPhoto && (
        <RegisterUserModal
          preloadedPhoto={capturedPhoto}
          onSuccess={() => {
            setShowRegisterModal(false);
            setCapturedPhoto(null);
          }}
        />
      )}
    </div>
  );
}
