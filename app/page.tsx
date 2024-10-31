"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSystems } from "./actions";
import { Music, Bell, Smile, Moon, Sun, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useTheme } from "next-themes";

interface System {
  name: string;
  slug: string;
}

export default function Component() {
  const [systems, setSystems] = useState<System[]>([]);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    async function fetchSystems() {
      try {
        const fetchedSystems = await getSystems();
        setSystems(fetchedSystems as System[]);
      } catch (error) {
        console.error("Failed to fetch systems:", error);
      }
    }
    fetchSystems();
  }, []);

  const mainFeatures = [
    {
      icon: <Smile className="w-6 h-6" />,
      title: "Effortless Entry",
      text: "Just walk in and smile! Our smart system automatically recognizes you and handles registration for new faces",
    },
    {
      icon: <Music className="w-6 h-6" />,
      title: "Spotify Integration",
      text: "Connect your Spotify account to play your favorite playlists and tracks from your connected devices",
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Stay In Sync",
      text: "Instant notifications via Slack, Telegram and more to keep your team in sync",
    },
  ];

  return (
    <div className="grid grid-rows-[auto_auto_1fr_auto] gap-8 p-8">
      <header className="flex justify-between items-center relative">
        <Logo />
        <div className="flex gap-4 items-center">
          <Button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            variant="ghost"
            size="icon"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button asChild>
            <a href="mailto:sahil@gumroad.com">Contact Sales</a>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Log into Dohr</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {systems.map((system) => (
                <DropdownMenuItem key={system.slug}>
                  <Link href={`/${system.slug}`}>
                    {system.name} ({system.slug})
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="text-center py-16 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-lg">
        <div className="flex items-center justify-center gap-4 text-4xl font-bold mb-4">
          <Zap className="w-12 h-12 text-yellow-500" />
          <h1>GET AMPED UP FOR WORK!</h1>
        </div>
        <p className="text-xl">
          Set the tone for the rest of the day by playing your welcome song when
          you walk in the door
        </p>
      </div>
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[2000px] mx-auto w-full h-fit">
        {mainFeatures.map((mainFeature, index) => (
          <Card key={index} className="p-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-4 text-xl">
                {mainFeature.icon}
                <span>{mainFeature.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{mainFeature.text}</p>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
