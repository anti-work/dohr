"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Camera, Pause, Play, Music } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  }, [users, isPaused, loadFaceMatcher]);

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
          <Button
            onClick={handleSpotifyAuth}
            className="bg-[#1DB954] hover:bg-[#1ED760] text-white font-bold py-2 px-4 rounded"
          >
            <Music className="mr-2" /> Connect Spotify
          </Button>
        </div>
      </header>
      <div className="flex gap-4">
        <Card className="w-1/2">
          <CardContent className="p-4">
            <div className="relative">
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Add new user</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new user. Click save when
                    you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="photo" className="text-right">
                        Photo
                      </Label>
                      <Input
                        type="file"
                        id="photo"
                        name="photo"
                        accept="image/*"
                        className="col-span-3"
                        ref={inputFileRef}
                        onChange={handlePhotoUpload}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2"
                    >
                      <Camera className="mr-2" /> <strong>Capture Photo</strong>
                    </Button>
                    {photoUrl && (
                      <div>
                        Uploaded photo: <a href={photoUrl}>{photoUrl}</a>
                      </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="audio" className="text-right">
                        Audio
                      </Label>
                      <Input
                        type="text"
                        id="audio"
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        placeholder="Search for a song"
                        className="col-span-3"
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
                              {track.name} -{" "}
                              {track.artists.map((a) => a.name).join(", ")}
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
                    <input
                      type="hidden"
                      name="audio_uri"
                      value={audioUri || ""}
                    />
                    <input
                      type="hidden"
                      name="photo_url"
                      value={photoUrl || ""}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit">
                      <strong>Save changes</strong>
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
                  <TableCell colSpan={4} className="text-center">
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
