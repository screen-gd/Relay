"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Toggles `.dark` on the root element and persists the choice under the
 * `relay-theme` localStorage key. Light is the default; the pre-hydration
 * script in app/layout.tsx restores the stored preference.
 */
export default function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("relay-theme", dark ? "dark" : "light");
    } catch {
      // Storage unavailable; keep the in-memory toggle only.
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={toggle}
    >
      <Moon
        className="theme-icon-light group-hover/button:-rotate-12"
        aria-hidden="true"
      />
      <Sun
        className="theme-icon-dark group-hover/button:rotate-45"
        aria-hidden="true"
      />
    </Button>
  );
}
