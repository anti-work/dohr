import { ImageResponse } from "next/og";

export const runtime = "edge";

// Image metadata
export const size = {
  width: 128,
  height: 128,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          width: 128,
          height: 128,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "black",
        }}
      >
        <div
          style={{
            width: "1em",
            height: "1em",
            borderRadius: "9999px",
            backgroundColor: "currentColor",
            display: "block",
            position: "absolute",
            right: "1.5em",
            top: "2.5em",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
