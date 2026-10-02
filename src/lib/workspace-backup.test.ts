import { describe, expect, it } from "vitest";
import {
  createWorkspaceBackup,
  parseWorkspaceBackup,
} from "./workspace-backup";

describe("workspace backup", () => {
  it("round-trips workspace records without connected-account details", () => {
    const records = {
      projects: [{ id: "project-1", title: "Launch film" }],
      clients: [{ id: "client-1", name: "Studio" }],
      resources: [{ id: "resource-1", url: "https://example.com/brief" }],
      salaryBatches: [{ id: "batch-1", amount: 500 }],
    };
    const backup = createWorkspaceBackup({
      ...records,
      settings: {
        theme: "Light",
        integrationConfigs: { Slack: { webhookUrl: "https://secret.example" } },
        integrationLinks: { Slack: "secret@example.com" },
      },
    });
    expect(backup).not.toContain("secret.example");
    expect(backup).not.toContain("secret@example.com");
    expect(parseWorkspaceBackup(backup)).toMatchObject({
      ...records,
      version: 1,
      settings: { theme: "Light" },
    });
  });

  it("rejects unsupported or incomplete files before import", () => {
    expect(() => parseWorkspaceBackup('{"version":2}')).toThrow(/unsupported/i);
    expect(() =>
      parseWorkspaceBackup(
        '{"version":1,"projects":[],"clients":[],"resources":[],"salaryBatches":[],"settings":{}}'
      )
    ).toThrow(/incomplete/i);
  });

  it("keeps Project Groups and accepts older version-one backups", () => {
    const source = createWorkspaceBackup({
      projects: [],
      clients: [],
      projectGroups: [{ id: "group-1" }],
      resources: [],
      salaryBatches: [],
      settings: {},
    });
    expect(parseWorkspaceBackup(source).projectGroups).toEqual([
      { id: "group-1" },
    ]);
    expect(
      parseWorkspaceBackup(
        '{"version":1,"exportedAt":"2026-01-01","projects":[],"clients":[],"resources":[],"salaryBatches":[],"settings":{}}'
      ).projectGroups
    ).toEqual([]);
  });
});
