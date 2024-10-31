"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Music } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { searchSpotify, registerUser } from "@/app/actions";

interface RegisterUserModalProps {
  trigger?: React.ReactNode;
  preloadedPhoto?: string;
  onSuccess?: () => void;
}

export function RegisterUserModal({ trigger, preloadedPhoto, onSuccess }: RegisterUserModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string>(preloadedPhoto || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(true);

  // ... (keep the existing search and track selection logic)

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
          {/* ... (keep the existing form content) */}
        </form>
      </DialogContent>
    </Dialog>
  );
}