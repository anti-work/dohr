import { ImageResponse } from "next/og";

export const runtime = "edge";

import Logo from "@/components/Logo";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "black",
        }}
      >
        <div className="w-[0.1em] h-[0.1em] rounded-full bg-current inline-block absolute right-[0.05em]" />
      </div>
    ),
    {
      ...size,
    }
  );
}
