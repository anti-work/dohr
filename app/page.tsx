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
import { Music, Bell, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";

interface System {
  name: string;
  slug: string;
}

export default function Component() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
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

  const handleDropdownClick = (dropdownName: string) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const features = [
    {
      icon: <Music className="w-6 h-6" />,
      title: "Welcome Songs",
      text: "Customized audio playback based on identification",
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Notifications",
      text: "Pings sent to Slack and Telegram",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Admin Interface",
      text: "For user registration and management",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <main className="flex-grow flex items-center justify-center w-full">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-2">
                <Logo />
                <h2 className="text-xl font-light tracking-tighter sm:text-2xl md:text-3xl lg:text-4xl/none">
                  An AI-Powered Doorbell
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-8">
                {features.map((feature, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-center space-x-3">
                        {feature.icon}
                        <span>{feature.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{feature.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-x-4 mt-8">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button onClick={() => handleDropdownClick("contact")}>
                      Contact Sales
                    </Button>
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
                    <Button
                      variant="outline"
                      onClick={() => handleDropdownClick("login")}
                    >
                      Log into Dohr
                    </Button>
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
