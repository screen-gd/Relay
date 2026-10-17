import {
  Bell,
  FolderKanban,
  Globe2,
  History,
  LockKeyhole,
  Palette,
} from "@/components/icons";

export const settingsNavigation = [
  { id: "workspace", label: "Workspace", icon: FolderKanban },
  { id: "workflow", label: "Workflow", icon: History },
  { id: "permissions", label: "Permissions", icon: LockKeyhole },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "regional", label: "Regional", icon: Globe2 },
] as const;
