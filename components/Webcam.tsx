"use client";

import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface WebcamProps {
  isPaused?: boolean;
  onFaceDetected?: (detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]) => void;
  faceMatcher?: faceapi.FaceMatcher;
  fullscreen?: boolean;
  onCapture?: (blob: Blob) => void;
}

export function Webcam({
  isPaused = false,
  onFaceDetected,
  faceMatcher,
  fullscreen = false,
  onCapture,
}: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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

    startVideo();
  }, []);

  useEffect(() => {
    if (
      videoRef.current &&
      canvasRef.current &&
      onFaceDetected &&
      faceMatcher
    ) {
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

          if (detections.length > 0) {
            onFaceDetected(detections);
          }
        }, 300);
      });
    }
  }, [isPaused, onFaceDetected, faceMatcher]);

  const handleCapture = () => {
    if (!videoRef.current || !onCapture) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, "image/jpeg");
  };

  return (
    <div className={`relative ${fullscreen ? "h-screen w-screen" : ""}`}>
      <video ref={videoRef} width="100%" height="100%" autoPlay muted></video>
      <canvas
        ref={canvasRef}
        width="720"
        height="560"
        className="absolute top-0 left-0"
      ></canvas>
      {onCapture && (
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
      )}
      <Badge
        variant={isPaused ? "secondary" : "destructive"}
        className="absolute top-2 right-2 rounded-full"
      >
        {isPaused ? "Paused" : "Live"}
      </Badge>
    </div>
  );
}
