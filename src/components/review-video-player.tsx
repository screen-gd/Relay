"use client";

import { useEffect, useRef } from "react";

export type ReviewPlayer = {
  getCurrentTime: () => Promise<number>;
  seekTo: (seconds: number) => Promise<void>;
};

type YouTubePlayer = {
  getCurrentTime(): number;
  seekTo(seconds: number, ahead: boolean): void;
  destroy(): void;
};
type VimeoPlayer = {
  ready(): Promise<void>;
  getCurrentTime(): Promise<number>;
  setCurrentTime(seconds: number): Promise<number>;
  destroy(): Promise<void>;
};
declare global {
  interface Window {
    YT?: {
      Player: new (
        frame: HTMLIFrameElement,
        options: { events: { onReady: () => void } }
      ) => YouTubePlayer;
    };
    Vimeo?: { Player: new (frame: HTMLIFrameElement) => VimeoPlayer };
  }
}
const scripts = new Map<string, Promise<void>>();
function loadScript(url: string) {
  const existing = scripts.get(url);
  if (existing) return existing;
  const pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      scripts.delete(url);
      reject(new Error("Player API unavailable"));
    };
    document.head.append(script);
  });
  scripts.set(url, pending);
  return pending;
}

export function ReviewVideoPlayer({
  url,
  title,
  onReady,
}: {
  url: string;
  title: string;
  onReady: (player: ReviewPlayer | undefined) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    onReady(undefined);
    const source = new URL(url);
    const youtube = source.hostname === "www.youtube-nocookie.com";
    if (youtube) {
      source.searchParams.set("enablejsapi", "1");
      source.searchParams.set("origin", window.location.origin);
    }
    const frame = document.createElement("iframe");
    frame.src = source.href;
    frame.title = title;
    frame.className = "h-full w-full border-0";
    frame.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    host.replaceChildren(frame);
    void (async () => {
      try {
        if (youtube) {
          await loadScript("https://www.youtube.com/iframe_api");
          // The iframe API loads its Player constructor through a second script.
          for (
            let attempts = 0;
            !window.YT?.Player && attempts < 100 && !cancelled;
            attempts++
          ) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          if (cancelled || !window.YT?.Player) return;
          const player = new window.YT.Player(frame, {
            events: {
              onReady: () => {
                if (!cancelled)
                  onReady({
                    getCurrentTime: async () => player.getCurrentTime(),
                    seekTo: async (seconds) => {
                      player.seekTo(seconds, true);
                    },
                  });
              },
            },
          });
          cleanup = () => player.destroy();
        } else {
          await loadScript("https://player.vimeo.com/api/player.js");
          if (cancelled || !window.Vimeo) return;
          const player = new window.Vimeo.Player(frame);
          cleanup = () => {
            void player.destroy().catch(() => {});
          };
          await player.ready();
          if (!cancelled)
            onReady({
              getCurrentTime: () => player.getCurrentTime(),
              seekTo: async (seconds) => {
                await player.setCurrentTime(seconds);
              },
            });
        }
      } catch {
        // Playback and manual timestamp comments remain available without the API.
        if (!cancelled) onReady(undefined);
      }
    })();
    return () => {
      cancelled = true;
      cleanup?.();
      host.replaceChildren();
    };
  }, [url, title, onReady]);
  return (
    <div
      ref={container}
      className="aspect-video overflow-hidden rounded-lg bg-black sm:col-span-2"
    />
  );
}
