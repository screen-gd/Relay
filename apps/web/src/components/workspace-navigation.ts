import {
  CalendarDays,
  CheckSquare2,
  CircleUserRound,
  CreditCard,
  FileText,
  FolderKanban,
  Globe2,
  Home,
  Images,
  Library,
  MessageCircle,
  MessageSquareText,
  Plug,
  Settings,
  Users,
  UsersRound,
  Workflow,
} from "@/components/icons";
import type { FileRouteTypes } from "@/routeTree.gen";

/**
 * Where every workspace page lives in the navigation. The sidebar, the
 * collapsed rail, the mobile sheet, the top bar views and the command menu
 * all read this file, so a page is never reachable from one and missing from
 * another.
 */

export type ShellPage =
  | "dashboard"
  | "projects"
  | "clients"
  | "timeline"
  | "calendar"
  | "files"
  | "media"
  | "resources"
  | "feedback"
  | "templates"
  | "reports"
  | "integrations"
  | "team"
  | "team-chat"
  | "settings"
  | "account"
  | "subscription"
  | "profile"
  | "profile-edit"
  | "organization-profile";

/** Registered routes without path params, safe to link to with `to` alone. */
export type StaticPath = Exclude<FileRouteTypes["to"], `${string}$${string}`>;

export type NavIcon = typeof Home;

export type RouteItem = {
  page: ShellPage;
  label: string;
  href: StaticPath;
  icon: NavIcon;
  /** The G-chord that opens it, shown in the command menu. */
  shortcut?: string;
};

export const routes = {
  dashboard: {
    page: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: Home,
    shortcut: "G D",
  },
  projects: {
    page: "projects",
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    shortcut: "G P",
  },
  calendar: {
    page: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    shortcut: "G C",
  },
  timeline: {
    page: "timeline",
    label: "Timeline",
    href: "/timeline",
    icon: Workflow,
  },
  feedback: {
    page: "feedback",
    label: "Reviews",
    href: "/feedback",
    icon: MessageSquareText,
  },
  clients: {
    page: "clients",
    label: "Clients",
    href: "/clients",
    icon: UsersRound,
  },
  files: { page: "files", label: "Files", href: "/files", icon: FileText },
  media: { page: "media", label: "Media", href: "/media", icon: Images },
  templates: {
    page: "templates",
    label: "Templates",
    href: "/templates",
    icon: CheckSquare2,
  },
  resources: {
    page: "resources",
    label: "Resources",
    href: "/resources",
    icon: Library,
  },
  reports: {
    page: "reports",
    label: "Payments",
    href: "/reports",
    icon: CreditCard,
    shortcut: "G R",
  },
  team: { page: "team", label: "Members", href: "/team", icon: Users },
  "team-chat": {
    page: "team-chat",
    label: "Team chat",
    href: "/team-chat",
    icon: MessageCircle,
  },
  settings: {
    page: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    shortcut: "G S",
  },
  integrations: {
    page: "integrations",
    label: "Integrations",
    href: "/integrations",
    icon: Plug,
  },
  account: {
    page: "account",
    label: "Account",
    href: "/account",
    icon: CircleUserRound,
  },
  subscription: {
    page: "subscription",
    label: "Plans and billing",
    href: "/subscription",
    icon: CreditCard,
  },
  "profile-edit": {
    page: "profile-edit",
    label: "Profile",
    href: "/profile/edit",
    icon: CircleUserRound,
  },
  profile: {
    page: "profile",
    label: "Public profile",
    href: "/profile",
    icon: Globe2,
  },
  "organization-profile": {
    page: "organization-profile",
    label: "Organization profile",
    href: "/organization",
    icon: UsersRound,
  },
} as const satisfies Record<ShellPage, RouteItem>;

export const allRoutes: readonly RouteItem[] = Object.values(routes);

export type NavSection = {
  id: string;
  label: string;
  items: readonly RouteItem[];
};

/** The always-visible top of the sidebar: the places people go every day. */
export const primaryRoutes: readonly RouteItem[] = [
  routes.dashboard,
  routes.projects,
  routes.feedback,
];

/** Collapsible sidebar groups below the primary routes. */
export const sidebarSections: readonly NavSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      routes.clients,
      routes.files,
      routes.media,
      routes.templates,
      routes.resources,
      routes.reports,
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [routes.team, routes["team-chat"]],
  },
];

/**
 * Pages that are views of one list share a segmented control in the top bar,
 * as Linear does for issue views. The first entry owns the sidebar item.
 */
export const viewGroups: readonly (readonly RouteItem[])[] = [
  [{ ...routes.projects, label: "List" }, routes.calendar, routes.timeline],
];

/**
 * Settings is its own mode, as in Linear: the sidebar swaps to these groups
 * with a way back. The workspace sections live on /settings?section=...
 */
export const settingsSections = [
  { id: "workspace", label: "General" },
  { id: "workflow", label: "Workflow" },
  { id: "ai", label: "AI" },
  { id: "permissions", label: "Permissions" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance and region" },
  { id: "regional", label: "Appearance and region" },
  { id: "data", label: "Data and export" },
] as const;

export type SettingsSectionId = (typeof settingsSections)[number]["id"];

export function isSettingsSection(value: unknown): value is SettingsSectionId {
  return settingsSections.some((section) => section.id === value);
}

/** Regional settings share the Appearance page; old links land there. */
export function settingsNavSection(
  id: SettingsSectionId | undefined
): SettingsSectionId {
  if (!id) return "workspace";
  return id === "regional" ? "appearance" : id;
}

export type SettingsNavItem =
  | { kind: "section"; id: SettingsSectionId; label: string }
  | { kind: "route"; item: RouteItem };

const section = (id: SettingsSectionId, label: string): SettingsNavItem => ({
  kind: "section",
  id,
  label,
});
const route = (item: RouteItem): SettingsNavItem => ({ kind: "route", item });

/**
 * The settings sidebar, grouped by what the settings are about. Related
 * pages share an entry: Appearance holds the regional settings, Profile
 * links to the public profile, and the organization profile opens from the
 * workspace menu.
 */
export const settingsNavGroups: readonly {
  label: string;
  items: readonly SettingsNavItem[];
}[] = [
  {
    label: "Workspace",
    items: [
      section("workspace", "General"),
      section("workflow", "Workflow"),
      section("permissions", "Permissions"),
      section("ai", "AI"),
    ],
  },
  {
    label: "Preferences",
    items: [
      section("appearance", "Appearance and region"),
      section("notifications", "Notifications"),
    ],
  },
  {
    label: "Data",
    items: [section("data", "Data and export"), route(routes.integrations)],
  },
  {
    label: "Account",
    items: [
      route(routes["profile-edit"]),
      route(routes.account),
      route(routes.subscription),
    ],
  },
];

const settingsPages: readonly ShellPage[] = [
  "settings",
  "integrations",
  "account",
  "subscription",
  "profile-edit",
  "organization-profile",
];

export function isSettingsPage(page: ShellPage) {
  return settingsPages.includes(page);
}

export function workspacePageForPath(pathname: string): ShellPage {
  if (pathname === "/sample-studio") return "dashboard";
  if (pathname.startsWith("/sample-studio/projects/")) return "projects";
  if (pathname.startsWith("/projects/")) return "projects";
  return (
    allRoutes.find((route) => route.href === pathname)?.page ?? "dashboard"
  );
}

/** The view group a page belongs to, when it is one of several views. */
export function viewGroupFor(page: ShellPage) {
  return viewGroups.find((group) => group.some((item) => item.page === page));
}

/** The sidebar item that stands for `page`: itself, or its view group's owner. */
export function sidebarPageFor(page: ShellPage): ShellPage {
  return viewGroupFor(page)?.[0]?.page ?? page;
}

/** Command menu groups: every product route, in sidebar order. */
export const commandGroups: readonly NavSection[] = [
  {
    id: "go",
    label: "Go to",
    items: [
      routes.dashboard,
      routes.projects,
      routes.calendar,
      routes.timeline,
      routes.feedback,
    ],
  },
  ...sidebarSections,
  {
    id: "settings",
    label: "Settings",
    items: [
      routes.settings,
      routes.integrations,
      routes.account,
      routes.subscription,
    ],
  },
];

/** G-chord targets, keyed by the second key. */
export const goShortcuts: Partial<Record<string, StaticPath>> = {
  d: "/",
  c: "/calendar",
  p: "/projects",
  r: "/reports",
  s: "/settings",
};

export const supportLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
] as const satisfies readonly { label: string; href: StaticPath }[];
