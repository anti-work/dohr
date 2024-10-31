"use client";

import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface WebcamProps {
  isPaused?: boolean;
  onFaceDetected?: (detection: any) => void;
  faceMatcher?: any;
  fullscreen?: boolean;
}

export function Webcam({ isPaused = false, onFaceDetected, faceMatcher, fullscreen = false }: WebcamProps) {
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
    if (videoRef.current && canvasRef.current && onFaceDetected && faceMatcher) {
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

  return (
    <div className={`relative ${fullscreen ? 'h-screen w-screen' : ''}`}>
      <video
        ref={videoRef}
        width="100%"
        height="100%"
        autoPlay
        muted
      ></video>
      <canvas
        ref={canvasRef}
        width="720"
        height="560"
        className="absolute top-0 left-0"
      ></canvas>
      <Badge
        variant={isPaused ? "secondary" : "destructive"}
        className="absolute top-2 right-2 rounded-full"
      >
        {isPaused ? "Paused" : "Live"}
      </Badge>
    </div>
  );
}