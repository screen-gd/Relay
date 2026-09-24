import { expect, test } from "vitest";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { omitLegacySettings, settingsPatch } from "./settings-persistence";

test("persisted settings omit local-only fields", () => {
  expect(
    omitLegacySettings({
      theme: "Dark",
      density: "Compact",
    })
  ).toEqual({ theme: "Dark" });
});

test("settings patches keep client fields out of preference changes", () => {
  const previous = createDefaultSettings();
  const next = createDefaultSettings();
  next.customClients = ["Acme"];
  next.clients = [
    {
      id: "client-1",
      name: "Acme",
      company: "Acme",
      contactName: "Alex",
      email: "alex@example.com",
      phone: "",
      notes: "",
      archived: false,
    },
  ];

  const patch = settingsPatch(previous, next);

  expect(patch.changes).not.toHaveProperty("clients");
  expect(patch.changes).not.toHaveProperty("customClients");
  expect(patch.clients).toEqual(next.clients);
});
