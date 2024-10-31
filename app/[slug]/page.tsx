"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pause, Play, Music, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as faceapi from "face-api.js";
import {
  getUsers,
  removeUser,
  togglePause,
  getPauseState,
  notifyAdmin,
  getEntrances,
  registerEntrance,
  addToQueue,
  removeEntrance,
  getSpotifyAuthUrl,
  getSpotifyDevices,
  setSpotifyDevice,
  generateAndPlayAudio,
} from "../actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Webcam } from "@/components/Webcam";
import { RegisterUserModal } from "@/components/RegisterUserModal";

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

interface SpotifyDevice {
  id: string;
  name: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [entrances, setEntrances] = useState<
    { name: string; timestamp: string; id: number }[]
  >([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyDevices, setSpotifyDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SpotifyDevice | null>(
    null
  );

  const handlePinSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pin === "825") {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect PIN");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      fetchPauseState();
      fetchEntrances();
      startVideo();
      const checkSpotifyConnection = async () => {
        try {
          const devices = await getSpotifyDevices();
          setIsSpotifyConnected(devices.length > 0);
          setSpotifyDevices(devices);
        } catch (error) {
          console.error("Error checking Spotify connection:", error);
        }
      };

      checkSpotifyConnection();
    }
  }, [isAuthenticated]);

  const loadFaceMatcher = useCallback(async () => {
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
  }, [users]);

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

  useEffect(() => {
    if (isAuthenticated && videoRef.current && canvasRef.current) {
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
                        await addToQueue(matchedUser.audio_uri);
                        const message = `${matchedUser.name} is in the building!`;
                        notifyAdmin(message);
                        fetchEntrances();

                        try {
                          const base64Audio = await generateAndPlayAudio(
                            message
                          );
                          const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
                          const audio = new Audio(audioUrl);
                          audio.play();
                        } catch (error) {
                          console.error("Error playing audio:", error);
                        }
                      } else {
                        console.log(
                          `${matchedUser.name} has already entered today. Skipping notification.`
                        );
                      }
                    }
                  } else {
                    console.log("Unknown person at the door");
                  }
                }
              }
            }
          }
        }, 300);
      });
    }
  }, [users, isPaused, loadFaceMatcher, isAuthenticated]);

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
    if (isSpotifyConnected) {
      // If already connected, do nothing
      return;
    }
    const authUrl = await getSpotifyAuthUrl();
    window.location.href = authUrl;
  };

  const handleDeviceSelect = async (device: SpotifyDevice) => {
    setSelectedDevice(device);
    await setSpotifyDevice(device.id);
  };

  const handleFaceDetection = async (detections: any[]) => {
    if (!faceMatcher.current) return;

    for (const detection of detections) {
      const bestMatch = faceMatcher.current.findBestMatch(detection.descriptor);

      if (bestMatch.distance < 0.6) {
        const matchedUser = users.find((user) => user.name === bestMatch.label);

        if (matchedUser) {
          const isNewEntry = await registerEntrance(matchedUser.name);
          if (isNewEntry) {
            await addToQueue(matchedUser.audio_uri);
            const message = `${matchedUser.name} is in the building!`;
            notifyAdmin(message);
            fetchEntrances();

            try {
              const base64Audio = await generateAndPlayAudio(message);
              const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
              const audio = new Audio(audioUrl);
              audio.play();
            } catch (error) {
              console.error("Error playing audio:", error);
            }
          } else {
            console.log(
              `${matchedUser.name} has already entered today. Skipping notification.`
            );
          }
        }
      } else {
        console.log("Unknown person at the door");
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Enter PIN</CardTitle>
            <CardDescription>
              Please enter the PIN to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="pin">PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <Button type="submit">
                  <Lock className="mr-2 h-4 w-4" /> Unlock
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dohr</h1>
        <div>
          <Button
            onClick={handleTogglePause}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
          >
            {isPaused ? <Play className="mr-2" /> : <Pause className="mr-2" />}
            {isPaused ? "Unpause" : "Pause"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                onClick={isSpotifyConnected ? undefined : handleSpotifyAuth}
                className="bg-[#1DB954] hover:bg-[#1ED760] text-white font-bold py-2 px-4 rounded"
              >
                <Music className="mr-2" />
                {isSpotifyConnected ? "Connected" : "Connect Spotify"}
                {isSpotifyConnected && <ChevronDown className="ml-2" />}
              </Button>
            </DropdownMenuTrigger>
            {isSpotifyConnected && (
              <DropdownMenuContent>
                {spotifyDevices.map((device) => (
                  <DropdownMenuItem
                    key={device.id}
                    onSelect={() => handleDeviceSelect(device)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedDevice?.id === device.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {device.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </header>
      <div className="flex gap-4">
        <Card className="w-1/2">
          <CardContent className="p-4">
            <Webcam
              isPaused={isPaused}
              onFaceDetected={handleFaceDetection}
              faceMatcher={faceMatcher.current}
            />
          </CardContent>
        </Card>

        <Card className="w-1/2">
          <CardHeader>
            <CardTitle>Today&apos;s Entrances</CardTitle>
            <CardDescription>Recent entries to the building</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              {entrances.map((entrance) => (
                <div
                  key={entrance.id}
                  className="mb-4 grid grid-cols-[25px_1fr_auto] items-start pb-4 last:mb-0 last:pb-0"
                >
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {entrance.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entrance.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleRemoveEntrance(entrance.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Registered Users</span>
            <RegisterUserModal onSuccess={fetchUsers} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center pt-8">
                    No users registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={user.photo_url} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.track_name}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleRemoveUser(user.id)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                      >
                        <strong>Remove</strong>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
