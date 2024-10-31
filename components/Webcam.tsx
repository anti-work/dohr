"use client";

import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { addToQueue, registerEntrance, notifyAdmin, generateAndPlayAudio } from "@/app/actions";

interface WebcamProps {
  isPaused?: boolean;
  users: {
    name: string;
    photo_url: string;
    audio_uri: string;
  }[];
  fullscreen?: boolean;
  onCapture?: (blob: Blob) => void;
  onEntranceRegistered?: () => void;
}

export function Webcam({
  isPaused = false,
  users,
  fullscreen = false,
  onCapture,
  onEntranceRegistered,
}: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);
  const modelsLoaded = useRef(false);

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

  const loadModels = async () => {
    if (!modelsLoaded.current) {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      modelsLoaded.current = true;
    }
  };

  const loadFaceMatcher = async () => {
    await loadModels();

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
          if (isPaused || !modelsLoaded.current) return;

          const detections = await faceapi
            .detectAllFaces(videoRef.current!)
            .withFaceLandmarks()
            .withFaceDescriptors();

          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

              for (const detection of resizedDetections) {
                if (faceMatcher.current) {
                  const bestMatch = faceMatcher.current.findBestMatch(detection.descriptor);
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
                      const isNewEntry = await registerEntrance(matchedUser.name);
                      if (isNewEntry) {
                        await addToQueue(matchedUser.audio_uri);
                        const message = `${matchedUser.name} is in the building!`;
                        notifyAdmin(message);
                        onEntranceRegistered?.();

                        try {
                          const base64Audio = await generateAndPlayAudio(message);
                          const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
                          const audio = new Audio(audioUrl);
                          audio.play();
                        } catch (error) {
                          console.error("Error playing audio:", error);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }, 300);
      });
    }
  }, [isPaused, users, onEntranceRegistered]);

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
