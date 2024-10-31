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
  Smile,
  Moon,
  Sun,
  Zap,
  Check,
  Shuffle,
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
  const [footerBgColor, setFooterBgColor] = useState("#3D0C11");
  const [footerTextColor, setFooterTextColor] = useState("#FFFFFF");

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

  const generateRandomColors = () => {
    const generateRandomColor = () =>
      `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;

    const getContrastRatio = (color1: string, color2: string) => {
      const luminance = (color: string) => {
        const rgb = parseInt(color.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const l1 = luminance(color1);
      const l2 = luminance(color2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    let bgColor, textColor;
    do {
      bgColor = generateRandomColor();
      textColor = generateRandomColor();
    } while (getContrastRatio(bgColor, textColor) < 4.5);

    setFooterBgColor(bgColor);
    setFooterTextColor(textColor);
  };

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
      text: "Instant notifications via Slack, Telegram and more to keep your team socially connected with notifications",
    },
  ];

  return (
    <div className="grid grid-rows-[auto_auto_1fr_auto_auto] gap-8 p-8">
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
      <section className="bg-slate-800 text-white dark:bg-slate-900 rounded-lg p-16 pb-8">
        <div className="flex gap-8 items-start">
          <div className="flex-1 text-left">
            <div className="text-5xl font-bold mt-2 mb-4">$2,500</div>
            <div className="text-xl text-slate-300 mb-8">
              One-time installation fee
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Check className="text-green-400" />
                <span>Unlimited users</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-400" />
                <span>Free unlimited usage forever</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-400" />
                <span>All features included</span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Check className="text-green-400" />
                <span>Custom integration options</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-400" />
                <span>Regular software updates</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-400" />
                <span>Priority bug fixes</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer
        className="w-full h-[15vh] px-12 transition-colors duration-300 flex items-center rounded-lg"
        style={{ backgroundColor: footerBgColor }}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center">
            <div className="flex flex-col items-start">
              <a
                href="https://antiwork.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  width="200"
                  height="40"
                  viewBox="0 0 500 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M99.94 73.44H111.04L105.64 57.72H105.52L99.94 73.44ZM100.84 47.16H110.5L126.52 90H116.74L113.5 80.46H97.48L94.12 90H84.64L100.84 47.16ZM129.314 58.98H137.414V63.3H137.594C138.674 61.5 140.074 60.2 141.794 59.4C143.514 58.56 145.274 58.14 147.074 58.14C149.354 58.14 151.214 58.46 152.654 59.1C154.134 59.7 155.294 60.56 156.134 61.68C156.974 62.76 157.554 64.1 157.874 65.7C158.234 67.26 158.414 69 158.414 70.92V90H149.894V72.48C149.894 69.92 149.494 68.02 148.694 66.78C147.894 65.5 146.474 64.86 144.434 64.86C142.114 64.86 140.434 65.56 139.394 66.96C138.354 68.32 137.834 70.58 137.834 73.74V90H129.314V58.98ZM175.681 58.98H181.921V64.68H175.681V80.04C175.681 81.48 175.921 82.44 176.401 82.92C176.881 83.4 177.841 83.64 179.281 83.64C179.761 83.64 180.221 83.62 180.661 83.58C181.101 83.54 181.521 83.48 181.921 83.4V90C181.201 90.12 180.401 90.2 179.521 90.24C178.641 90.28 177.781 90.3 176.941 90.3C175.621 90.3 174.361 90.2 173.161 90C172.001 89.84 170.961 89.5 170.041 88.98C169.161 88.46 168.461 87.72 167.941 86.76C167.421 85.8 167.161 84.54 167.161 82.98V64.68H162.001V58.98H167.161V49.68H175.681V58.98ZM194.734 54.18H186.214V47.16H194.734V54.18ZM186.214 58.98H194.734V90H186.214V58.98ZM236.903 90H228.143L222.623 69.18H222.503L217.223 90H208.403L198.563 58.98H207.563L213.263 80.04H213.383L218.543 58.98H226.823L232.103 79.98H232.223L237.923 58.98H246.683L236.903 90ZM257.87 74.52C257.87 75.76 257.99 76.98 258.23 78.18C258.47 79.34 258.87 80.4 259.43 81.36C260.03 82.28 260.81 83.02 261.77 83.58C262.73 84.14 263.93 84.42 265.37 84.42C266.81 84.42 268.01 84.14 268.97 83.58C269.97 83.02 270.75 82.28 271.31 81.36C271.91 80.4 272.33 79.34 272.57 78.18C272.81 76.98 272.93 75.76 272.93 74.52C272.93 73.28 272.81 72.06 272.57 70.86C272.33 69.66 271.91 68.6 271.31 67.68C270.75 66.76 269.97 66.02 268.97 65.46C268.01 64.86 266.81 64.56 265.37 64.56C263.93 64.56 262.73 64.86 261.77 65.46C260.81 66.02 260.03 66.76 259.43 67.68C258.87 68.6 258.47 69.66 258.23 70.86C257.99 72.06 257.87 73.28 257.87 74.52ZM249.35 74.52C249.35 72.04 249.73 69.8 250.49 67.8C251.25 65.76 252.33 64.04 253.73 62.64C255.13 61.2 256.81 60.1 258.77 59.34C260.73 58.54 262.93 58.14 265.37 58.14C267.81 58.14 270.01 58.54 271.97 59.34C273.97 60.1 275.67 61.2 277.07 62.64C278.47 64.04 279.55 65.76 280.31 67.8C281.07 69.8 281.45 72.04 281.45 74.52C281.45 77 281.07 79.24 280.31 81.24C279.55 83.24 278.47 84.96 277.07 86.4C275.67 87.8 273.97 88.88 271.97 89.64C270.01 90.4 267.81 90.78 265.37 90.78C262.93 90.78 260.73 90.4 258.77 89.64C256.81 88.88 255.13 87.8 253.73 86.4C252.33 84.96 251.25 83.24 250.49 81.24C249.73 79.24 249.35 77 249.35 74.52ZM286.99 58.98H295.09V64.74H295.21C295.61 63.78 296.15 62.9 296.83 62.1C297.51 61.26 298.29 60.56 299.17 60C300.05 59.4 300.99 58.94 301.99 58.62C302.99 58.3 304.03 58.14 305.11 58.14C305.67 58.14 306.29 58.24 306.97 58.44V66.36C306.57 66.28 306.09 66.22 305.53 66.18C304.97 66.1 304.43 66.06 303.91 66.06C302.35 66.06 301.03 66.32 299.95 66.84C298.87 67.36 297.99 68.08 297.31 69C296.67 69.88 296.21 70.92 295.93 72.12C295.65 73.32 295.51 74.62 295.51 76.02V90H286.99V58.98ZM311.09 47.16H319.61V70.14L330.35 58.98H340.43L328.73 70.38L341.75 90H331.43L322.91 76.14L319.61 79.32V90H311.09V47.16Z"
                    fill={footerTextColor}
                  />
                  <path
                    d="M8.608 8.864H10.648V15.272H10.696C11.032 14.584 11.56 14.088 12.28 13.784C13 13.464 13.792 13.304 14.656 13.304C15.616 13.304 16.448 13.48 17.152 13.832C17.872 14.184 18.464 14.664 18.928 15.272C19.408 15.864 19.768 16.552 20.008 17.336C20.248 18.12 20.368 18.952 20.368 19.832C20.368 20.712 20.248 21.544 20.008 22.328C19.784 23.112 19.432 23.8 18.952 24.392C18.488 24.968 17.896 25.424 17.176 25.76C16.472 26.096 15.648 26.264 14.704 26.264C14.4 26.264 14.056 26.232 13.672 26.168C13.304 26.104 12.936 26 12.568 25.856C12.2 25.712 11.848 25.52 11.512 25.28C11.192 25.024 10.92 24.712 10.696 24.344H10.648V26H8.608V8.864ZM18.208 19.688C18.208 19.112 18.128 18.552 17.968 18.008C17.824 17.448 17.592 16.952 17.272 16.52C16.968 16.088 16.568 15.744 16.072 15.488C15.592 15.232 15.024 15.104 14.368 15.104C13.68 15.104 13.096 15.24 12.616 15.512C12.136 15.784 11.744 16.144 11.44 16.592C11.136 17.024 10.912 17.52 10.768 18.08C10.64 18.64 10.576 19.208 10.576 19.784C10.576 20.392 10.648 20.984 10.792 21.56C10.936 22.12 11.16 22.616 11.464 23.048C11.784 23.48 12.192 23.832 12.688 24.104C13.184 24.36 13.784 24.488 14.488 24.488C15.192 24.488 15.776 24.352 16.24 24.08C16.72 23.808 17.104 23.448 17.392 23C17.68 22.552 17.888 22.04 18.016 21.464C18.144 20.888 18.208 20.296 18.208 19.688ZM33.0346 26H31.1146V24.032H31.0666C30.6346 24.8 30.0826 25.368 29.4106 25.736C28.7386 26.088 27.9466 26.264 27.0346 26.264C26.2186 26.264 25.5386 26.16 24.9946 25.952C24.4506 25.728 24.0106 25.416 23.6746 25.016C23.3386 24.616 23.0986 24.144 22.9546 23.6C22.8266 23.04 22.7626 22.424 22.7626 21.752V13.592H24.8026V21.992C24.8026 22.76 25.0266 23.368 25.4746 23.816C25.9226 24.264 26.5386 24.488 27.3226 24.488C27.9466 24.488 28.4826 24.392 28.9306 24.2C29.3946 24.008 29.7786 23.736 30.0826 23.384C30.3866 23.032 30.6106 22.624 30.7546 22.16C30.9146 21.68 30.9946 21.16 30.9946 20.6V13.592H33.0346V26ZM38.2585 11.36H36.2185V8.864H38.2585V11.36ZM36.2185 13.592H38.2585V26H36.2185V13.592ZM41.5388 8.864H43.5788V26H41.5388V8.864ZM49.5711 13.592H52.0431V15.392H49.5711V23.096C49.5711 23.336 49.5871 23.528 49.6191 23.672C49.6671 23.816 49.7471 23.928 49.8591 24.008C49.9711 24.088 50.1231 24.144 50.3151 24.176C50.5231 24.192 50.7871 24.2 51.1071 24.2H52.0431V26H50.4831C49.9551 26 49.4991 25.968 49.1151 25.904C48.7471 25.824 48.4431 25.688 48.2031 25.496C47.9791 25.304 47.8111 25.032 47.6991 24.68C47.5871 24.328 47.5311 23.864 47.5311 23.288V15.392H45.4191V13.592H47.5311V9.872H49.5711V13.592ZM61.0611 8.864H63.1011V15.272H63.1491C63.4851 14.584 64.0131 14.088 64.7331 13.784C65.4531 13.464 66.2451 13.304 67.1091 13.304C68.0691 13.304 68.9011 13.48 69.6051 13.832C70.3251 14.184 70.9171 14.664 71.3811 15.272C71.8611 15.864 72.2211 16.552 72.4611 17.336C72.7011 18.12 72.8211 18.952 72.8211 19.832C72.8211 20.712 72.7011 21.544 72.4611 22.328C72.2371 23.112 71.8851 23.8 71.4051 24.392C70.9411 24.968 70.3491 25.424 69.6291 25.76C68.9251 26.096 68.1011 26.264 67.1571 26.264C66.8531 26.264 66.5091 26.232 66.1251 26.168C65.7571 26.104 65.3891 26 65.0211 25.856C64.6531 25.712 64.3011 25.52 63.9651 25.28C63.6451 25.024 63.3731 24.712 63.1491 24.344H63.1011V26H61.0611V8.864ZM70.6611 19.688C70.6611 19.112 70.5811 18.552 70.4211 18.008C70.2771 17.448 70.0451 16.952 69.7251 16.52C69.4211 16.088 69.0211 15.744 68.5251 15.488C68.0451 15.232 67.4771 15.104 66.8211 15.104C66.1331 15.104 65.5491 15.24 65.0691 15.512C64.5891 15.784 64.1971 16.144 63.8931 16.592C63.5891 17.024 63.3651 17.52 63.2211 18.08C63.0931 18.64 63.0291 19.208 63.0291 19.784C63.0291 20.392 63.1011 20.984 63.2451 21.56C63.3891 22.12 63.6131 22.616 63.9171 23.048C64.2371 23.48 64.6451 23.832 65.1411 24.104C65.6371 24.36 66.2371 24.488 66.9411 24.488C67.6451 24.488 68.2291 24.352 68.6931 24.08C69.1731 23.808 69.5571 23.448 69.8451 23C70.1331 22.552 70.3411 22.04 70.4691 21.464C70.5971 20.888 70.6611 20.296 70.6611 19.688ZM80.0877 27.656C79.8477 28.264 79.6077 28.776 79.3677 29.192C79.1437 29.608 78.8877 29.944 78.5997 30.2C78.3277 30.472 78.0157 30.664 77.6637 30.776C77.3277 30.904 76.9357 30.968 76.4877 30.968C76.2477 30.968 76.0077 30.952 75.7677 30.92C75.5277 30.888 75.2957 30.832 75.0717 30.752V28.88C75.2477 28.96 75.4477 29.024 75.6717 29.072C75.9117 29.136 76.1117 29.168 76.2717 29.168C76.6877 29.168 77.0317 29.064 77.3037 28.856C77.5917 28.664 77.8077 28.384 77.9517 28.016L78.7917 25.928L73.8717 13.592H76.1757L79.7997 23.744H79.8477L83.3277 13.592H85.4877L80.0877 27.656Z"
                    fill={footerTextColor}
                  />
                  <path
                    d="M57 91L41.4115 47.5L72.5885 47.5L57 91Z"
                    fill={footerTextColor}
                  />
                  <path
                    d="M25 91L9.41154 47.5L40.5885 47.5L25 91Z"
                    fill={footerTextColor}
                  />
                </svg>
              </a>
            </div>
          </div>
          <div className="flex items-center">
            <Button
              onClick={generateRandomColors}
              className="transition-colors duration-300"
              size="icon"
              style={{ backgroundColor: footerTextColor, color: footerBgColor }}
            >
              <Shuffle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
