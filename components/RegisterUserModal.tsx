"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { registerUser, searchSpotify } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";
import { Webcam } from "@/components/Webcam";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  preview_url: string;
  uri: string;
}

interface RegisterUserModalProps {
  trigger?: React.ReactNode;
  preloadedPhoto?: string;
  onSuccess?: () => void;
}

export function RegisterUserModal({
  trigger,
  preloadedPhoto,
  onSuccess,
}: RegisterUserModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string>(preloadedPhoto || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [audioUri, setAudioUri] = useState<string>("");
  const [showSearchResults, setShowSearchResults] = useState(true);
  const [showWebcam, setShowWebcam] = useState(!preloadedPhoto);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    if (!selectedTrack?.uri || !photoUrl) {
      alert("Please provide all required information");
      return;
    }

    try {
      await registerUser(name, photoUrl, selectedTrack.uri, selectedTrack.name);
      onSuccess?.();
    } catch (error) {
      console.error("Error registering user:", error);
      alert("Error registering user");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Register New User</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="photo" className="text-right">
                Photo
              </Label>
              {showWebcam ? (
                <div className="col-span-3">
                  <Webcam fullscreen={false} />
                </div>
              ) : (
                <div className="col-span-3">
                  {photoUrl ? (
                    <div className="flex flex-col gap-2">
                      <Image
                        src={photoUrl}
                        alt="Captured"
                        className="w-48 h-48 object-cover rounded"
                      />
                      <Button type="button" onClick={() => setShowWebcam(true)}>
                        <Camera className="mr-2" /> Retake Photo
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" onClick={() => setShowWebcam(true)}>
                      <Camera className="mr-2" /> Capture Photo
                    </Button>
                  )}
                </div>
              )}
            </div>
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
            <input type="hidden" name="audio_uri" value={audioUri || ""} />
            <input type="hidden" name="photo_url" value={photoUrl || ""} />
          </div>
          <DialogFooter>
            <Button type="submit">
              <strong>Add user</strong>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
