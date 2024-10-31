"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { registerUser, searchSpotify } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  preview_url: string;
  uri: string;
}

interface RegisterUserModalProps {
  preloadedPhoto?: string;
  onSuccess?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RegisterUserModal({
  preloadedPhoto,
  onSuccess,
  isOpen,
  onOpenChange,
}: RegisterUserModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [audioUri, setAudioUri] = useState<string>("");
  const [showSearchResults, setShowSearchResults] = useState(true);

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

    if (!selectedTrack?.uri || !preloadedPhoto) {
      alert("Please provide all required information");
      return;
    }

    try {
      await registerUser(
        name,
        preloadedPhoto,
        selectedTrack.uri,
        selectedTrack.name
      );
      onSuccess?.();
    } catch (error) {
      console.error("Error registering user:", error);
      alert("Error registering user");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              <div className="col-span-3">
                {preloadedPhoto && (
                  <div className="flex flex-col gap-2">
                    <Image
                      src={preloadedPhoto}
                      alt="Captured"
                      width={192}
                      height={192}
                      className="w-48 h-48 object-cover rounded"
                    />
                  </div>
                )}
              </div>
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
            <input
              type="hidden"
              name="photo_url"
              value={preloadedPhoto || ""}
            />
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
