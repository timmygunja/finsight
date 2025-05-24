"use client";

import { useRef } from "react";

function VideoBackground() {
  const videoRef = useRef(null);

  return (
    <video
      ref={videoRef}
      className="video-background"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    >
      <source src="/background.mp4" type="video/mp4" />
      Ваш браузер не поддерживает видео.
    </video>
  );
}

export default VideoBackground;
