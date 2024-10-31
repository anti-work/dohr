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
  Trash2,
  Radio,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";

interface System {
  name: string;
  slug: string;
}

export default function Component() {
  const [systems, setSystems] = useState<System[]>([]);

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
    <div className="min-h-screen grid grid-rows-[auto_1fr] gap-8 p-8">
      <header className="flex justify-between items-center relative">
        <Logo />
        <div className="flex gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>Contact Sales</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {systems.map((system) => (
                <DropdownMenuItem key={system.slug}>
                  <Link href={`/${system.slug}`}>{system.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
      <main className="flex flex-col gap-6 max-w-[2000px] mx-auto w-full">
        {mainFeatures.map((mainFeature, index) => (
          <Card key={index} className="p-8 lg:p-12 xl:p-16">
            <CardHeader>
              <CardTitle className="flex items-center gap-4 text-2xl lg:text-3xl xl:text-4xl">
                {mainFeature.icon}
                <span>{mainFeature.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl lg:text-2xl xl:text-3xl mb-8">
                {mainFeature.text}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mainFeature.subFeatures.map((subFeature, subIndex) => (
                  <Card key={subIndex} className="p-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {subFeature.icon}
                        <span>{subFeature.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base">{subFeature.text}</p>
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
