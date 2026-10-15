import {
  Accessibility,
  Bell,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  CircleUserRound,
  CreditCard,
  Database,
  FileText,
  FolderKanban,
  Images,
  Info,
  LayoutDashboard,
  Library,
  PanelLeft,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  ShieldCheck,
  ScrollText,
  Users,
  UsersRound,
  UserPlus,
  Workflow,
} from "@/components/icons";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { useData } from "@/lib/data-context";
import { marketingSiteUrl } from "@/lib/site";
import { useOptionalAuth } from "@/lib/optional-auth";
import type { SettingsState } from "@/lib/types";
import type { FileRouteTypes } from "@/routeTree.gen";
import type { SearchRecord } from "@/features/workspace-discovery/workspace-discovery";
import { FeedbackButton } from "@/features/feedback/feedback-button";
import { AiToolsMenu } from "@/features/ai/ai-tools-menu";
import { AiBadge, useAiAccount } from "@/features/ai/ai-availability";
import {
  aiToolHref,
  aiTools,
  aiToolsForPage,
  featuredAiToolIds,
} from "@/features/ai/ai-tools";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { RelayBrand } from "@/app/relay-brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
type StaticPath = Exclude<FileRouteTypes["to"], `${string}$${string}`>;

type RouteItem = {
  page: ShellPage;
  label: string;
  href: StaticPath;
  icon: typeof LayoutDashboard;
  shortcut?: string;
};

type RouteGroup = {
  label: string;
  items: RouteItem[];
};

const routeGroups: RouteGroup[] = [
  {
    label: "Overview",
    items: [
      {
        page: "dashboard",
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        shortcut: "G D",
      },
      {
        page: "calendar",
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        shortcut: "G C",
      },
      {
        page: "timeline",
        label: "Timeline",
        href: "/timeline",
        icon: Workflow,
      },
    ],
  },
  {
    label: "Work",
    items: [
      {
        page: "projects",
        label: "Projects",
        href: "/projects",
        icon: FolderKanban,
        shortcut: "G P",
      },
      { page: "clients", label: "Clients", href: "/clients", icon: UsersRound },
      {
        page: "feedback",
        label: "Reviews",
        href: "/feedback",
        icon: MessageSquareText,
      },
      { page: "files", label: "Files", href: "/files", icon: FileText },
      { page: "media", label: "Media", href: "/media", icon: Images },
      {
        page: "templates",
        label: "Templates",
        href: "/templates",
        icon: CheckSquare2,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        page: "resources",
        label: "Resources",
        href: "/resources",
        icon: Library,
      },
      {
        page: "integrations",
        label: "Integrations",
        href: "/integrations",
        icon: Sparkles,
      },
      {
        page: "reports",
        label: "Payments",
        href: "/reports",
        icon: CreditCard,
        shortcut: "G R",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      { page: "team", label: "Team", href: "/team", icon: Users },
      {
        page: "team-chat",
        label: "Team chat",
        href: "/team-chat",
        icon: MessageSquareText,
      },
      {
        page: "settings",
        label: "Settings",
        href: "/settings",
        icon: Settings,
        shortcut: "G S",
      },
    ],
  },
];

const allRoutes = routeGroups.flatMap((group) => group.items);

export function workspacePageForPath(pathname: string): ShellPage {
  if (pathname === "/sample-studio") return "dashboard";
  if (pathname.startsWith("/sample-studio/projects/")) return "projects";
  if (pathname.startsWith("/projects/")) return "projects";
  if (pathname === "/profile/edit") return "profile-edit";
  if (pathname === "/profile") return "profile";
  if (pathname === "/organization") return "organization-profile";
  if (pathname === "/account") return "account";
  if (pathname === "/subscription") return "subscription";
  return (
    allRoutes.find((route) => route.href === pathname)?.page ?? "dashboard"
  );
}

/** The sidebar keeps five work hubs plus Team and Settings. */
const sidebarGroups: RouteGroup[] = [
  {
    label: "Workspace",
    items: routesFor([
      "dashboard",
      "projects",
      "clients",
      "feedback",
      "reports",
    ]),
  },
  {
    label: "Account",
    items: routesFor(["team", "settings"]),
  },
];

const hubPages: ShellPage[] = sidebarGroups.flatMap((group) =>
  group.items.map((item) => item.page)
);
const hubRoutes = sidebarGroups.flatMap((group) => group.items);
const mobileRoutes = hubRoutes.filter((item) =>
  ["dashboard", "projects", "clients", "feedback"].includes(item.page)
);
/** Pages that live under a hub instead of the sidebar. */
const contextPages: Partial<Record<ShellPage, ShellPage[]>> = {
  projects: ["projects", "calendar", "timeline", "files", "media"],
  team: ["team", "team-chat"],
  settings: ["settings", "integrations", "templates", "resources"],
};

function routesFor(pages: ShellPage[]): RouteItem[] {
  return pages.flatMap((page) =>
    allRoutes.filter((item) => item.page === page)
  );
}

function hubPageForPage(page: ShellPage): ShellPage {
  return (
    hubPages.find((hub) => contextPages[hub]?.includes(page)) ??
    ([
      "account",
      "subscription",
      "profile",
      "profile-edit",
      "organization-profile",
    ].includes(page)
      ? "settings"
      : page)
  );
}

type SupportLink =
  | { label: string; href: StaticPath; icon: typeof Mail; external?: false }
  | { label: string; href: string; icon: typeof Mail; external: true };

const compactSupportLinks: readonly SupportLink[] = [
  { label: "Contact", href: "/contact", icon: Mail },
  { label: "Privacy", href: "/privacy", icon: ShieldCheck },
  { label: "Terms", href: "/terms", icon: ScrollText },
  { label: "Accessibility", href: "/accessibility", icon: Accessibility },
  {
    label: "About",
    href: `${marketingSiteUrl}/about`,
    icon: Info,
    external: true,
  },
  {
    label: "Privacy & Data",
    href: `${marketingSiteUrl}/privacy-and-data`,
    icon: Database,
    external: true,
  },
];

const shellTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

const quickRouteShortcuts: Partial<Record<string, StaticPath>> = {
  d: "/",
  c: "/calendar",
  p: "/projects",
  r: "/reports",
  s: "/settings",
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CL";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function routeIsActive(currentPage: ShellPage, item: RouteItem) {
  return hubPageForPage(currentPage) === item.page;
}

function ContextNavigation({ page }: { page: ShellPage }) {
  const hub = hubRoutes.find((item) => item.page === hubPageForPage(page));
  if (!hub || !contextPages[hub.page]) return null;
  const items = hubChildren(hub.page);
  // Account and profile pages borrow the Settings hub but are not tabs there.
  if (!items.some((item) => item.page === page)) return null;
  return (
    <nav
      aria-label={`${hub.label} navigation`}
      className="flex shrink-0 flex-wrap gap-5 border-b border-[var(--app-border)] px-5"
    >
      {items.map((item) => (
        <Link
          key={item.page}
          to={item.href}
          aria-current={page === item.page ? "page" : undefined}
          className={cn(
            "-mb-px flex min-h-11 items-center border-b-2 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
            page === item.page
              ? "border-[var(--app-ink)] text-[var(--app-ink)]"
              : "border-transparent text-[var(--app-muted)] hover:text-[var(--app-ink)]"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

const BreadcrumbContext = createContext<(label: string | null) => void>(
  () => {}
);

/**
 * Shows `label` after the page name in the shell's top-bar breadcrumb while
 * the calling page is mounted, e.g. a project's title on its detail page.
 */
export function useWorkspaceBreadcrumb(label: string) {
  const setBreadcrumb = useContext(BreadcrumbContext);
  useEffect(() => {
    setBreadcrumb(label);
    return () => setBreadcrumb(null);
  }, [label, setBreadcrumb]);
}

export function WorkspaceShell({
  page,
  settings,
  onNewProject,
  canCreateProject,
  pageTitle,
  notificationSlot,
  searchRecords = [],
  children,
}: {
  page: ShellPage;
  settings: SettingsState;
  onNewProject: () => void;
  canCreateProject: boolean;
  pageTitle?: string;
  notificationSlot?: ReactNode;
  searchRecords?: readonly SearchRecord[];
  children: ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null);
  const [sidebarPinned, toggleSidebarPin] = useSidebarPinned();
  const goChordRef = useRef(false);
  const goChordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandReturnFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useHydratedReducedMotion();
  const navigate = useNavigate();
  const openCommand = () => {
    if (document.activeElement instanceof HTMLElement) {
      commandReturnFocusRef.current = document.activeElement;
    }
    setCommandOpen(true);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (commandOpen) setCommandOpen(false);
        else openCommand();
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;
      const isEditing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (isEditing || event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (goChordRef.current) {
        goChordRef.current = false;
        if (goChordTimerRef.current) clearTimeout(goChordTimerRef.current);
        const href = quickRouteShortcuts[key];
        if (href) {
          event.preventDefault();
          void navigate({ to: href });
        }
        return;
      }

      if (key === "g") {
        goChordRef.current = true;
        goChordTimerRef.current = setTimeout(() => {
          goChordRef.current = false;
        }, 900);
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (goChordTimerRef.current) clearTimeout(goChordTimerRef.current);
    };
  }, [commandOpen, navigate]);

  const title = useMemo(
    () =>
      pageTitle ??
      (page === "subscription"
        ? "Subscription"
        : (allRoutes.find((route) => route.page === page)?.label ?? "Relay")),
    [page, pageTitle]
  );

  return (
    <BreadcrumbContext.Provider value={setBreadcrumb}>
      <div
        data-testid="workspace-shell"
        data-sidebar={sidebarPinned ? "pinned" : "rail"}
        className="relay-density-balanced min-h-dvh bg-[var(--app-canvas)] text-[var(--app-ink)] lg:h-dvh lg:overflow-hidden lg:bg-[var(--app-sidebar)]"
      >
        <DesktopSidebar
          page={page}
          pinned={sidebarPinned}
          onTogglePin={toggleSidebarPin}
        />

        <div className="min-h-dvh transition-[padding] duration-200 ease-out motion-reduce:transition-none lg:pl-[var(--sidebar-width)]">
          <header className="workspace-topbar fixed inset-x-0 top-0 z-30 flex h-[54px] items-center border-b border-[var(--app-border)] bg-[var(--app-canvas)] px-2.5 transition-[left] duration-200 ease-out motion-reduce:transition-none lg:left-[var(--sidebar-width)] lg:right-2 lg:top-2 lg:justify-between lg:rounded-t-xl lg:px-4">
            <div className="flex h-full min-w-0 flex-1 items-center gap-2 lg:flex-none">
              <RelayBrand compact className="lg:hidden" />
              <p className="truncate text-sm font-semibold lg:hidden">
                {breadcrumb ?? title}
              </p>
              <Breadcrumb
                className="hidden min-w-0 lg:block"
                aria-label={`Current location: ${breadcrumb ? `${title} / ${breadcrumb}` : title}`}
              >
                <BreadcrumbList className="min-w-0 flex-nowrap gap-1.5 text-xs">
                  <BreadcrumbItem>
                    <span className="font-medium text-[var(--app-subtle)]">
                      Relay
                    </span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-[var(--app-strong-border)]">
                    /
                  </BreadcrumbSeparator>
                  <BreadcrumbItem className="min-w-0">
                    <span
                      className={cn(
                        "min-w-0 truncate font-medium",
                        breadcrumb
                          ? "text-[var(--app-subtle)]"
                          : "text-[var(--app-ink)]"
                      )}
                    >
                      {title}
                    </span>
                  </BreadcrumbItem>
                  {breadcrumb ? (
                    <>
                      <BreadcrumbSeparator className="text-[var(--app-strong-border)]">
                        /
                      </BreadcrumbSeparator>
                      <BreadcrumbItem className="min-w-0">
                        <span className="max-w-[min(32vw,28rem)] truncate text-sm font-semibold text-[var(--app-ink)]">
                          {breadcrumb}
                        </span>
                      </BreadcrumbItem>
                    </>
                  ) : null}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <Button
              variant="outline"
              className="absolute left-1/2 top-1/2 hidden h-9 w-[240px] -translate-x-1/2 -translate-y-1/2 justify-start rounded-lg border-[var(--app-border)] !bg-[var(--surface-panel)] px-3 text-xs text-[var(--app-muted)] shadow-none hover:text-[var(--app-ink)] active:-translate-y-1/2 active:scale-100 lg:flex"
              onClick={openCommand}
              aria-label="Quick Search (Ctrl K)"
            >
              <Search className="size-3.5 shrink-0" />
              <span className="truncate">Quick Search</span>
              <Kbd className="ml-auto h-auto min-w-0 rounded-none bg-transparent px-0 font-mono text-[9px] text-[var(--app-subtle)]">
                Ctrl K
              </Kbd>
            </Button>

            <div className="ml-3 flex h-9 items-center gap-1.5 lg:ml-0">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Search pages and workspace actions (Ctrl K)"
                onClick={openCommand}
              >
                <Search className="size-[18px]" />
              </Button>
              <div className="hidden h-9 items-center sm:flex">
                <Button
                  aria-label="Quick create project"
                  className="h-9 px-3 text-xs shadow-none"
                  onClick={onNewProject}
                  disabled={!canCreateProject}
                >
                  <Plus className="size-3.5" />
                  Quick create
                </Button>
              </div>
              {notificationSlot ?? (
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="size-[18px]" />
                </Button>
              )}
              <AiToolsMenu />
              <FeedbackButton />
              <ProfileMenu settings={settings} compact page={page} />
            </div>
          </header>

          <main
            id="main-content"
            data-testid="workspace-content-surface"
            tabIndex={-1}
            className="workspace-scrollbar-hidden h-[calc(100dvh_-_68px_-_env(safe-area-inset-bottom))] overflow-y-auto bg-[var(--app-canvas)] pt-12 outline-none transition-[left] duration-200 ease-out motion-reduce:transition-none lg:fixed lg:bottom-2 lg:right-2 lg:top-[62px] lg:left-[var(--sidebar-width)] lg:h-auto lg:min-h-0 lg:overscroll-contain lg:rounded-b-xl lg:pt-0"
          >
            <div className="flex min-h-full flex-col lg:h-full">
              <ContextNavigation page={page} />
              <div className="min-h-0 flex-1">{children}</div>
            </div>
          </main>
        </div>

        {(page === "dashboard" || page === "projects") && canCreateProject ? (
          <Button
            type="button"
            aria-label="New Project"
            className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-40 flex min-h-12 items-center gap-2 rounded-md bg-[var(--app-accent)] px-4 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-[var(--app-shadow-2)] outline-none hover:bg-[var(--app-accent)]/90 focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-canvas)] sm:hidden"
            onClick={onNewProject}
          >
            <Plus className="size-4" />
            New project
          </Button>
        ) : null}

        <MobileNavigation
          page={page}
          open={moreOpen}
          onOpenChange={setMoreOpen}
        />
        <WorkspaceCommand
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onNewProject={onNewProject}
          returnFocusRef={commandReturnFocusRef}
          searchRecords={searchRecords}
        />
      </div>
    </BreadcrumbContext.Provider>
  );
}

const SIDEBAR_PIN_STORAGE_KEY = "relay:sidebar-pinned";
const RAIL_WIDTH = 56;
const PANEL_WIDTH = 248;

/**
 * Whether the hub panel stays open beside the rail. Closed is the default and
 * the panel then opens on hover or focus; the choice is remembered on this
 * device. Read after mount so the server render and the first client render
 * agree.
 */
function useSidebarPinned() {
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    try {
      setPinned(window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY) === "1");
    } catch {
      // Storage is unavailable; keep the rail-only default.
    }
  }, []);
  const toggle = () =>
    setPinned((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // The toggle still works for this visit.
      }
      return next;
    });
  return [pinned, toggle] as const;
}

/** One line under each hub's name in the panel. */
const hubSummaries: Partial<Record<ShellPage, string>> = {
  dashboard: "What needs attention today.",
  projects: "Work in progress, dates, files, and media.",
  clients: "Who you work with and what they owe.",
  feedback: "Review notes and revision rounds.",
  reports: "Earnings, deliveries, and payment batches.",
  team: "Members, roles, and team chat.",
  settings: "Workspace defaults, integrations, and templates.",
};

/**
 * Pages listed under a hub, in the panel and the context tabs alike. The
 * hub's own page comes first and is labelled "Overview".
 */
function hubChildren(hub: ShellPage) {
  return (contextPages[hub] ?? []).flatMap((page) =>
    allRoutes
      .filter((item) => item.page === page)
      .map((item) => (page === hub ? { ...item, label: "Overview" } : item))
  );
}

/** One-shot motion for the active markers and the panel; nothing loops. */
const markerTransition = {
  type: "spring",
  stiffness: 520,
  damping: 40,
  mass: 0.8,
} as const;
const panelTransition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] } as const;

const railLinkClassName =
  "group relative flex size-10 items-center justify-center rounded-[10px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset";

/**
 * Desktop navigation: a slim icon rail for the seven hubs, and a panel beside
 * it with the hovered hub's pages. The panel opens on hover or keyboard focus
 * and closes when the pointer leaves; the pin keeps it open for the current
 * hub and widens the layout.
 */
function DesktopSidebar({
  page,
  pinned,
  onTogglePin,
}: {
  page: ShellPage;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const activeHub = hubPageForPage(page);
  const reduceMotion = useHydratedReducedMotion();
  const [hoveredHub, setHoveredHub] = useState<ShellPage | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (openTimer.current) clearTimeout(openTimer.current);
    },
    []
  );
  // Navigating closes a hover panel; a pinned panel follows the new hub.
  useEffect(() => setHoveredHub(null), [page]);

  const show = (hub: ShellPage) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setHoveredHub(hub), 90);
  };
  const hold = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const release = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHoveredHub(null), 180);
  };

  const panelHub = hoveredHub ?? (pinned ? activeHub : null);
  const panelRoute = hubRoutes.find((item) => item.page === panelHub);
  const panelOpen = Boolean(panelRoute);

  return (
    <div
      className="fixed inset-y-0 left-0 z-40 hidden lg:flex"
      onMouseLeave={release}
      onKeyDown={(event) => {
        if (event.key === "Escape") setHoveredHub(null);
      }}
    >
      <aside
        className="flex h-full flex-col items-center bg-[var(--app-sidebar)] py-2"
        style={{ width: RAIL_WIDTH }}
        onMouseEnter={hold}
      >
        <div className="flex h-[46px] items-center">
          <RelayBrand variant="mark" compact />
        </div>
        <nav
          aria-label="Primary navigation"
          className="mt-2 flex min-h-0 flex-1 flex-col items-center gap-1"
        >
          {hubRoutes.map((item) => (
            <RailRoute
              key={item.page}
              item={item}
              active={routeIsActive(page, item)}
              showing={panelHub === item.page}
              reduceMotion={reduceMotion}
              onIntent={() => show(item.page)}
              onBlur={release}
            />
          ))}
        </nav>
        <nav
          aria-label="Support and legal"
          className="grid grid-cols-2 gap-0.5 px-1 pb-1"
        >
          {compactSupportLinks.map((link) => {
            const Icon = link.icon;
            const className =
              "flex size-6 items-center justify-center rounded-md text-[var(--app-muted)] outline-none transition-colors duration-150 hover:text-[var(--app-ink)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset";
            return (
              <Tooltip key={link.label}>
                <TooltipTrigger asChild>
                  {link.external ? (
                    <a
                      href={link.href}
                      aria-label={link.label}
                      target="_blank"
                      rel="noreferrer"
                      className={className}
                    >
                      <Icon className="size-3.5" />
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      aria-label={link.label}
                      className={className}
                    >
                      <Icon className="size-3.5" />
                    </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right">{link.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>

      <AnimatePresence initial={false}>
        {panelRoute ? (
          <motion.section
            key="hub-panel"
            aria-label={`${panelRoute.label} pages`}
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
            transition={panelTransition}
            onMouseEnter={hold}
            onFocus={hold}
            onBlur={release}
            className={cn(
              "flex h-full flex-col bg-[var(--app-sidebar)]",
              pinned
                ? "border-l border-[var(--app-border)]"
                : "my-2 rounded-r-xl border-y border-r border-[var(--app-strong-border)] bg-[var(--surface-overlay)] shadow-[var(--shadow-overlay)]"
            )}
            style={{ width: PANEL_WIDTH }}
          >
            <HubPanel
              hub={panelRoute}
              page={page}
              pinned={pinned}
              onTogglePin={onTogglePin}
              reduceMotion={reduceMotion}
            />
          </motion.section>
        ) : null}
      </AnimatePresence>
      {/* Keeps the pinned width stable when the panel is closed by Escape. */}
      {pinned && !panelOpen ? <div style={{ width: PANEL_WIDTH }} /> : null}
    </div>
  );
}

function RailRoute({
  item,
  active,
  showing,
  reduceMotion,
  onIntent,
  onBlur,
}: {
  item: RouteItem;
  active: boolean;
  /** The panel is open for this hub. */
  showing: boolean;
  reduceMotion: boolean;
  onIntent: () => void;
  onBlur: () => void;
}) {
  const Icon = item.icon;
  const aiHere = aiToolsForPage(item.page);
  return (
    <Link
      to={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onMouseEnter={onIntent}
      onFocus={onIntent}
      onBlur={onBlur}
      className={cn(
        railLinkClassName,
        active || showing
          ? "text-[var(--app-ink)]"
          : "text-[var(--app-muted)] hover:text-[var(--app-ink)]"
      )}
    >
      {active ? (
        <motion.span
          aria-hidden="true"
          layoutId="rail-active-item"
          transition={reduceMotion ? { duration: 0 } : markerTransition}
          className="absolute inset-0 rounded-[10px] bg-[var(--sidebar-active)]"
        />
      ) : null}
      <Icon
        className={cn(
          "relative size-[18px]",
          active && "text-[var(--app-highlight)]"
        )}
      />
      {aiHere.length ? (
        <span
          aria-hidden="true"
          data-slot="ai-nav-badge"
          className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--app-highlight)]"
        />
      ) : null}
    </Link>
  );
}

function HubPanel({
  hub,
  page,
  pinned,
  onTogglePin,
  reduceMotion,
}: {
  hub: RouteItem;
  page: ShellPage;
  pinned: boolean;
  onTogglePin: () => void;
  reduceMotion: boolean;
}) {
  const pages = hubChildren(hub.page);
  const aiHere = aiToolsForPage(hub.page);
  return (
    <>
      <div className="flex h-[54px] shrink-0 items-center justify-between pl-4 pr-2">
        <h2 className="truncate text-sm font-semibold">{hub.label}</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 text-[var(--app-muted)] hover:text-[var(--app-ink)]"
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
              aria-pressed={pinned}
              onClick={onTogglePin}
            >
              <PanelLeft className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {pinned ? "Unpin sidebar" : "Keep open"}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="px-4 text-xs leading-5 text-[var(--app-muted)]">
        {hubSummaries[hub.page]}
      </p>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2">
        {pages.length ? (
          <div
            role="group"
            aria-label={`${hub.label} pages`}
            className="space-y-0.5"
          >
            {pages.map((item) => {
              const current = page === item.page;
              return (
                <Link
                  key={item.page}
                  to={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-9 items-center rounded-[10px] px-3 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset",
                    current
                      ? "text-[var(--app-ink)]"
                      : "text-[var(--app-muted)] hover:text-[var(--app-ink)]"
                  )}
                >
                  {current ? (
                    <motion.span
                      aria-hidden="true"
                      layoutId={`panel-active-${hub.page}`}
                      transition={
                        reduceMotion ? { duration: 0 } : markerTransition
                      }
                      className="absolute inset-0 rounded-[10px] bg-[var(--sidebar-active)]"
                    />
                  ) : null}
                  <span className="relative truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <Link
            to={hub.href}
            aria-current={page === hub.page ? "page" : undefined}
            className="relative flex min-h-9 items-center rounded-[10px] bg-[var(--sidebar-active)] px-3 text-[13px] font-medium text-[var(--app-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
          >
            Open {hub.label}
          </Link>
        )}
      </div>
      {aiHere.length ? (
        <div className="shrink-0 border-t border-[var(--app-border)] px-4 py-3">
          <p className="text-[11px] font-medium text-[var(--app-subtle)]">
            AI tools here
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--app-muted)]">
            {aiHere.map((tool) => (
              <li key={tool.id}>{tool.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function ProfileMenu({
  settings,
  collapsed = false,
  compact = false,
  page,
}: {
  settings: SettingsState;
  collapsed?: boolean;
  compact?: boolean;
  page: ShellPage;
}) {
  const { isAuthEnabled } = useData();
  const { isSignedIn, openSignIn, openSignUp, signOut } = useOptionalAuth();
  const [open, setOpen] = useState(false);
  const reduceMotion = useHydratedReducedMotion();
  const name = settings.profileName || "Your profile";
  const handle = settings.profileUsername
    ? `@${settings.profileUsername.replace(/^@/, "")}`
    : settings.teamRole || "Editor";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "group flex items-center rounded-md text-left outline-none transition-[background-color,box-shadow] hover:bg-[var(--app-hover)] active:translate-y-0 active:scale-100 focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] data-[state=open]:bg-[var(--app-active)]",
            compact
              ? "h-9 w-9 justify-center p-0"
              : collapsed
                ? "w-full justify-center p-1"
                : "w-full gap-2.5 p-2"
          )}
          aria-label="Open profile menu"
        >
          <Avatar className="size-8 border border-[var(--app-strong-border)] bg-[var(--app-avatar-surface)] ring-1 ring-transparent transition-[border-color,box-shadow] group-data-[state=open]:border-[var(--app-accent)]">
            <AvatarImage
              src={settings.profileImageUrl || undefined}
              alt={name}
              className="object-cover"
            />
            <AvatarFallback className="bg-[var(--app-avatar-surface)] text-[11px] font-semibold text-[var(--app-ink)]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && !compact ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">
                  {name}
                </span>
                <span className="block truncate text-[11px] text-[var(--app-muted)]">
                  {handle}
                </span>
              </span>
              <span
                className={cn(
                  "flex transition-transform",
                  open && "rotate-180"
                )}
              >
                <ChevronDown className="size-3.5 text-[var(--app-muted)]" />
              </span>
            </>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={compact ? "bottom" : collapsed ? "right" : "top"}
        align={compact ? "end" : "start"}
        sideOffset={8}
        className="workspace-flyout w-[280px] rounded-xl border-[var(--app-border)] bg-[var(--app-panel)] p-1.5 text-[var(--app-ink)] shadow-[var(--app-shadow-2)] [&_[data-slot=dropdown-menu-item]]:h-9 [&_[data-slot=dropdown-menu-item]]:rounded-lg [&_[data-slot=dropdown-menu-item]]:text-[13px] [&_[data-slot=dropdown-menu-item]]:transition-colors"
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar className="size-9 border border-[var(--app-strong-border)] bg-[var(--app-avatar-surface)]">
            <AvatarImage
              src={settings.profileImageUrl || undefined}
              alt=""
              className="object-cover"
            />
            <AvatarFallback className="bg-[var(--app-avatar-surface)] text-xs font-semibold text-[var(--app-ink)]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">
              {name}
            </span>
            <span className="block truncate text-xs font-normal text-[var(--app-muted)]">
              {handle}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0.5 bg-[var(--app-border)]" />
        {!isSignedIn ? (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Local Workspace · stored in this browser
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!isAuthEnabled}
              onSelect={() => openSignIn()}
              className="bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
            >
              <LogIn /> Sign in
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isAuthEnabled}
              onSelect={() => openSignUp()}
            >
              <UserPlus /> Create account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {isSignedIn ? (
          <DropdownMenuItem asChild>
            <Link
              to="/subscription"
              aria-current={page === "subscription" ? "page" : undefined}
              className={cn(page === "subscription" && "bg-accent")}
            >
              <CreditCard /> Plans & billing
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link
            to="/profile"
            activeOptions={{ exact: true }}
            aria-current={page === "profile" ? "page" : undefined}
            className={cn(page === "profile" && "bg-accent")}
          >
            <CircleUserRound /> Public profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/organization"
            aria-current={page === "organization-profile" ? "page" : undefined}
            className={cn(page === "organization-profile" && "bg-accent")}
          >
            <UsersRound /> Organization profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/profile/edit"
            aria-current={page === "profile-edit" ? "page" : undefined}
            className={cn(page === "profile-edit" && "bg-accent")}
          >
            <Sparkles /> Edit profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/account"
            aria-current={page === "account" ? "page" : undefined}
            className={cn(page === "account" && "bg-accent")}
          >
            <Settings /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isSignedIn ? (
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        ) : isAuthEnabled ? null : (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Sign-in needs Clerk and Convex configuration.
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceCommand({
  open,
  onOpenChange,
  onNewProject,
  returnFocusRef,
  searchRecords,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewProject: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  searchRecords: readonly SearchRecord[];
}) {
  const reduceMotion = useHydratedReducedMotion();
  const { hasAccount, signIn } = useAiAccount();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const featuredAiTools = aiTools.filter((tool) =>
    featuredAiToolIds.includes(tool.id as (typeof featuredAiToolIds)[number])
  );
  const otherAiTools = aiTools.filter(
    (tool) => !featuredAiTools.includes(tool)
  );

  // Closes the menu, returns focus, then runs the action so a dialog the
  // action opens starts from the same place the menu did.
  function runCommand(action: () => void) {
    onOpenChange(false);
    requestAnimationFrame(() => {
      const target = returnFocusRef.current;
      if (target?.isConnected) target.focus();
      action();
    });
  }

  const aiCommand = (tool: (typeof aiTools)[number]) => (
    <CommandItem
      key={tool.id}
      value={`${tool.label} ${tool.home} ${tool.keywords}`}
      onSelect={() =>
        runCommand(() =>
          tool.id === "brief-import"
            ? onNewProject()
            : void navigate({ href: aiToolHref(tool, pathname) })
        )
      }
    >
      {hasAccount ? <Sparkles /> : <LockKeyhole />}
      <span className="min-w-0 flex-1 truncate">{tool.label}</span>
      <CommandShortcut>
        {hasAccount ? tool.home : "Sign in to use AI"}
      </CommandShortcut>
    </CommandItem>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden border-[var(--app-strong-border)] p-0 shadow-[0_24px_80px_color-mix(in_srgb,var(--app-ink)_18%,transparent)] sm:max-w-[620px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Workspace command menu</DialogTitle>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.18,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          <Command className="**:data-[slot=command-input-wrapper]:pr-12">
            <CommandInput
              aria-label="Search workspace commands"
              placeholder="Search pages and actions..."
            />
            <CommandList className="max-h-[420px]">
              <CommandEmpty>No matching workspace action found.</CommandEmpty>
              <CommandGroup heading="Quick actions">
                <CommandItem onSelect={() => runCommand(onNewProject)}>
                  <Plus /> Create new project
                </CommandItem>
                {featuredAiTools.map(aiCommand)}
              </CommandGroup>
              <CommandGroup heading="AI tools">
                {otherAiTools.map(aiCommand)}
              </CommandGroup>
              <CommandSeparator />
              {searchRecords.length ? (
                <CommandGroup heading="Workspace records">
                  {searchRecords
                    .filter((record) => record.kind !== "action")
                    .map((record) => (
                      <CommandItem
                        key={`${record.kind}:${record.id}`}
                        asChild
                        value={`${record.title} ${record.detail} ${record.keywords ?? ""}`}
                      >
                        <HrefLink
                          href={record.href ?? "/"}
                          onClick={() => onOpenChange(false)}
                        >
                          <FileText />
                          <span className="min-w-0 flex-1 truncate">
                            {record.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {record.detail}
                          </span>
                        </HrefLink>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ) : null}
              {searchRecords.length ? <CommandSeparator /> : null}
              {routeGroups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem key={item.page} asChild>
                        <Link
                          to={item.href}
                          onClick={() => onOpenChange(false)}
                        >
                          <Icon />
                          {item.label}
                          {item.shortcut ? (
                            <CommandShortcut>{item.shortcut}</CommandShortcut>
                          ) : null}
                        </Link>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Anchor for prebuilt href strings, such as search records with query
 * strings, that `Link` cannot type. Plain left clicks navigate in the app;
 * modified clicks keep normal anchor behavior.
 */
function HrefLink({
  href,
  onClick,
  ...props
}: ComponentProps<"a"> & { href: string }) {
  const navigate = useNavigate();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        void navigate({ href });
      }}
    />
  );
}

function MobileNavigation({
  page,
  open,
  onOpenChange,
}: {
  page: ShellPage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const primaryRoutes = mobileRoutes;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(68px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-panel)_94%,transparent)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {primaryRoutes.map((item) => {
        const Icon = item.icon;
        const active = routeIsActive(page, item);
        return (
          <Link
            key={item.page}
            to={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset",
              active ? "text-[var(--app-highlight)]" : "text-[var(--app-muted)]"
            )}
          >
            {active ? (
              <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--app-accent)]" />
            ) : null}
            <span className="flex flex-col items-center justify-center gap-1">
              <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </span>
          </Link>
        );
      })}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-full w-full flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium text-[var(--app-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset"
            aria-label="Open more workspace pages"
          >
            <motion.span
              animate={{
                rotate: open ? 90 : 0,
                scale: open && !reduceMotion ? 1.06 : 1,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              className="flex"
            >
              <MoreHorizontal className="size-[19px]" />
            </motion.span>
            More
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[82dvh] rounded-t-xl px-3 pb-8"
        >
          <SheetHeader className="px-1">
            <SheetTitle>Workspace</SheetTitle>
          </SheetHeader>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {hubRoutes
              .filter(
                (route) =>
                  !primaryRoutes.some((mobile) => mobile.page === route.page)
              )
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.page}
                    to={item.href}
                    onClick={() => onOpenChange(false)}
                    aria-current={
                      routeIsActive(page, item) ? "page" : undefined
                    }
                    className="group flex items-center gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-sm font-medium outline-none transition-[background-color,border-color] hover:border-[var(--app-strong-border)] hover:bg-[var(--app-soft-panel)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                  >
                    <span className="flex">
                      <Icon className="size-[18px] text-[var(--app-muted)] transition-colors group-hover:text-[var(--app-ink)]" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
          </div>
          <div className="mt-4 border-t border-[var(--app-border)] pt-4">
            <p className="px-1 text-xs font-semibold text-[var(--app-muted)]">
              Support and legal
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <Link
                className="min-h-12 rounded-md border border-[var(--app-border)] p-3"
                to="/contact"
                onClick={() => onOpenChange(false)}
              >
                Contact
              </Link>
              <Link
                className="min-h-12 rounded-md border border-[var(--app-border)] p-3"
                to="/privacy"
                onClick={() => onOpenChange(false)}
              >
                Privacy
              </Link>
              <Link
                className="min-h-12 rounded-md border border-[var(--app-border)] p-3"
                to="/terms"
                onClick={() => onOpenChange(false)}
              >
                Terms
              </Link>
              <Link
                className="min-h-12 rounded-md border border-[var(--app-border)] p-3"
                to="/accessibility"
                onClick={() => onOpenChange(false)}
              >
                Accessibility
              </Link>
            </div>
            <p className="mt-3 px-1 text-xs text-[var(--app-subtle)]">
              © {new Date().getFullYear()} Relay
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
