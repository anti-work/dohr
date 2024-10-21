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
        setSystems(fetchedSystems);
      } catch (error) {
        console.error("Failed to fetch systems:", error);
      }
    }
    fetchSystems();
  }, []);

  const handleDropdownClick = (dropdownName: string) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <main className="flex-grow flex items-center justify-center w-full">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Meet Dohr: Your AI-Powered Doorbell
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Enhance your home security with cutting-edge AI technology.
                  Dohr sees, hears, and thinks for your safety.
                </p>
              </div>
              <div className="space-x-4">
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
