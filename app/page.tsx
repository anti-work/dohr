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
import {
  Music,
  Bell,
  Shield,
  Users,
  Clock,
  Play,
  Volume2,
  UserPlus,
  Radio,
  MessageSquare,
  Zap,
  Moon,
  Sun,
} from "lucide-react";
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
      icon: <Users className="w-6 h-6" />,
      title: "Smart Access Control",
      text: "Advanced user recognition and security system",
      subFeatures: [
        {
          icon: <Shield className="w-6 h-6" />,
          title: "Secure Access",
          text: "PIN-protected admin interface",
        },
        {
          icon: <Clock className="w-6 h-6" />,
          title: "Entry Logging",
          text: "24-hour visitor tracking",
        },
        {
          icon: <UserPlus className="w-6 h-6" />,
          title: "Easy Registration",
          text: "Quick user onboarding process",
        },
      ],
    },
    {
      icon: <Music className="w-6 h-6" />,
      title: "Audio Experience",
      text: "Comprehensive audio and music management",
      subFeatures: [
        {
          icon: <Play className="w-6 h-6" />,
          title: "Music Control",
          text: "Spotify integration with device management",
        },
        {
          icon: <Radio className="w-6 h-6" />,
          title: "Device Sync",
          text: "Multi-device Spotify playback",
        },
        {
          icon: <Volume2 className="w-6 h-6" />,
          title: "Voice Synthesis",
          text: "AI-powered text-to-speech greetings",
        },
      ],
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Communication",
      text: "Comprehensive notification and messaging system",
      subFeatures: [
        {
          icon: <MessageSquare className="w-6 h-6" />,
          title: "Custom Messages",
          text: "Personalized welcome messages",
        },
        {
          icon: <Bell className="w-6 h-6" />,
          title: "Smart Notifications",
          text: "Instant alerts via Slack and Telegram",
        },
        {
          icon: <Radio className="w-6 h-6" />,
          title: "Intercom System",
          text: "Two-way communication with visitors",
        },
      ],
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
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[2000px] mx-auto w-full h-fit">
        {mainFeatures.map((mainFeature, index) => (
          <Card key={index} className="p-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-4 text-xl">
                {mainFeature.icon}
                <span>{mainFeature.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-8">{mainFeature.text}</p>
              <div className="flex flex-col gap-4">
                {mainFeature.subFeatures.map((subFeature, subIndex) => (
                  <Card key={subIndex} className="p-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {subFeature.icon}
                        <span>{subFeature.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{subFeature.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
