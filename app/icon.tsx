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
            width: "2.5em",
            height: "4em",
            border: ".3em solid currentColor",
            position: "relative",
            display: "flex",
          }}
        >
          <div
            style={{
              width: "0.4em",
              height: "0.4em",
              borderRadius: "9999px",
              backgroundColor: "currentColor",
              position: "absolute",
              right: "0.3em",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
