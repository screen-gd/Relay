"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { mergeClientRecords } from "@/lib/clients";
import { DEFAULT_PROFILE_ID } from "@/lib/profiles";
import type { Client } from "@/lib/types";
import { createProjectPort } from "@/features/projects/project-port";
import { canonicalClientName } from "@/features/routes/utils/work-type-utils";

export function useClientActions() {
  const { items, setItems, settings, setSettings, setToast } = useData();
  const projectPort = useMemo(() => createProjectPort(setItems), [setItems]);
  const clientRecords = useMemo(
    () =>
      mergeClientRecords(settings.clients, [
        ...settings.customClients,
        ...items
          .filter(
            (project) =>
              (project.profileId || DEFAULT_PROFILE_ID) === DEFAULT_PROFILE_ID
          )
          .flatMap((project) => (project.client ? [project.client] : [])),
      ]),
    [items, settings.clients, settings.customClients]
  );
  const clientOptions = useMemo(
    () =>
      clientRecords
        .filter((client) => !client.archived)
        .map((client) => client.name),
    [clientRecords]
  );

  function addClient(client: Omit<Client, "id" | "archived">): Client | null {
    const canonical = canonicalClientName(client.name, clientOptions, false);
    if (!canonical) return null;
    const existing = clientRecords.find(
      (record) => record.name.toLowerCase() === canonical.toLowerCase()
    );
    if (existing) return existing;
    const record = {
      ...mergeClientRecords([], [canonical])[0],
      ...client,
      name: canonical,
    };
    setSettings((current) => {
      if (current.clients.some((item) => item.id === record.id)) return current;
      return {
        ...current,
        customClients: [...current.customClients, canonical],
        clients: [...current.clients, record],
      };
    });
    setToast({ message: `Client "${canonical}" added.`, tone: "success" });
    return record;
  }

  function updateClient(client: Client) {
    setSettings((current) => ({
      ...current,
      clients: current.clients.map((record) =>
        record.id === client.id ? client : record
      ),
    }));
    projectPort.renameClient(client.id, client.name);
    setToast({
      message: client.archived
        ? `Client "${client.name}" archived.`
        : `Client "${client.name}" updated.`,
      tone: "success",
    });
  }

  return { clientRecords, clientOptions, addClient, updateClient };
}
