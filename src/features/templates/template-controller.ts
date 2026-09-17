"use client";

import { useData } from "@/lib/data-context";

export function useTemplateController() {
  const { items, settings, setSettings } = useData();
  return { items, settings, setSettings };
}
