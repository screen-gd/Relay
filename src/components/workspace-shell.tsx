import { RelayBrand } from "@/app/relay-brand";
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
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MessageSquarePlus,
  MessageSquareText,
  PanelLeft,
  Plus,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  UsersRound,
  Workflow,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  SegmentedLink,
  SegmentedNavigation,
} from "@/components/ui/segmented-navigation";
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
import { PageBar } from "@/components/workspace-page/page-bar";
import { useAiAccount } from "@/features/ai/ai-availability";
import {
  aiToolHref,
  aiTools,
  aiToolsForPage,
  featuredAiToolIds,
} from "@/features/ai/ai-tools";
import { AiToolsMenu } from "@/features/ai/ai-tools-menu";
import { FeedbackDialog } from "@/features/feedback/feedback-button";
import type { SearchRecord } from "@/features/workspace-discovery/workspace-discovery";
import {
  buildHubNavigation,
  type WorkspaceNavigationData,
} from "@/features/workspace/workspace-navigation";
import { useData } from "@/lib/data-context";
import { useHydratedReducedMotion } from "@/lib/motion";
import { useOptionalAuth } from "@/lib/optional-auth";
import { marketingSiteUrl } from "@/lib/site";
import type { SettingsState } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { FileRouteTypes } from "@/routeTree.gen";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";

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

/** The rail's seven routes: the five work hubs, then Team and Settings. */
const hubRoutes = routesFor([
  "dashboard",
  "projects",
  "clients",
  "feedback",
  "reports",
  "team",
  "settings",
]);
const hubPages: ShellPage[] = hubRoutes.map((item) => item.page);
const mobileRoutes = hubRoutes.filter((item) =>
  ["dashboard", "projects", "clients", "feedback", "reports"].includes(
    item.page
  )
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

/** Hubs with several pages share the page bar's segmented navigation. */
function hubHasPages(hub: ShellPage) {
  return hubChildren(hub).length > 1;
}

/** Whether the shell shows a tab strip naming `page` above the content. */
function hasContextTabs(page: ShellPage) {
  const hub = hubPageForPage(page);
  return (
    hubHasPages(hub) && hubChildren(hub).some((item) => item.page === page)
  );
}

function ContextNavigation({ page }: { page: ShellPage }) {
  const hub = hubRoutes.find((item) => item.page === hubPageForPage(page));
  const items = hub && hasContextTabs(page) ? hubChildren(hub.page) : [];
  if (!hub || !items.length) return null;
  return (
    <SegmentedNavigation aria-label={`${hub.label} navigation`}>
      {items.map((item) => (
        <SegmentedLink key={item.page} active={page === item.page} asChild>
          <Link to={item.href}>
            <span className="relative">{item.label}</span>
          </Link>
        </SegmentedLink>
      ))}
    </SegmentedNavigation>
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
  navigationData,
  children,
}: {
  page: ShellPage;
  settings: SettingsState;
  onNewProject: () => void;
  canCreateProject: boolean;
  pageTitle?: string;
  notificationSlot?: ReactNode;
  searchRecords?: readonly SearchRecord[];
  navigationData: WorkspaceNavigationData;
  children: ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null);
  const [sidebarOpen, toggleSidebar] = useSidebarOpen();
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

  const hub = hubRoutes.find((item) => item.page === hubPageForPage(page));
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (desktop.matches) setMoreOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  return (
    <BreadcrumbContext.Provider value={setBreadcrumb}>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <div
          data-testid="workspace-shell"
          data-sidebar={sidebarOpen ? "open" : "rail"}
          className="min-h-dvh bg-[var(--surface-page)] text-[var(--text-primary)] lg:h-dvh lg:overflow-hidden lg:bg-[var(--surface-frame)]"
        >
          <DesktopSidebar
            page={page}
            open={sidebarOpen}
            onToggle={toggleSidebar}
            onNewProject={onNewProject}
            canCreateProject={canCreateProject}
            data={navigationData}
            settings={settings}
          />
          {/*
            One inset panel holds the top bar and the page. On a phone it is
            full bleed; from lg it floats 8px inside the frame.
          */}
          <section
            aria-label="Workspace"
            className="fixed inset-x-0 top-0 bottom-[calc(var(--shell-mobile-nav-height)+env(safe-area-inset-bottom))] z-20 flex flex-col overflow-hidden bg-[var(--surface-page)] transition-[left] duration-(--motion-base) ease-(--motion-ease-standard) lg:bottom-2 lg:left-[calc(var(--sidebar-width)+var(--shell-inset))] lg:right-2 lg:top-2 lg:rounded-(--radius-panel) lg:border lg:border-[var(--border-panel)]"
          >
            <header className="workspace-topbar flex h-(--shell-topbar-height) shrink-0 items-center gap-2 px-3 lg:px-4">
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open workspace navigation"
                >
                  <PanelLeft />
                </Button>
              </SheetTrigger>
              <p className="truncate text-body font-medium lg:hidden">
                {breadcrumb ?? title}
              </p>
              <div className="hidden min-w-0 lg:block">
                <PageTitleChip
                  page={page}
                  label={pageTitle ?? title}
                  hub={hub}
                  sample={navigationData.sample}
                  pages={hubChildren(hubPageForPage(page))}
                />
              </div>
              <Button
                variant="secondary"
                className="ml-auto hidden w-60 shrink-0 justify-start xl:flex"
                onClick={openCommand}
                aria-label="Search workspace (Ctrl K)"
              >
                <Search />
                <span>Search</span>
                <Kbd className="ml-auto">Ctrl K</Kbd>
              </Button>
              <div className="ml-auto flex shrink-0 items-center gap-1 xl:ml-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="xl:hidden"
                  aria-label="Search workspace (Ctrl K)"
                  onClick={openCommand}
                >
                  <Search />
                </Button>
                {notificationSlot ?? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                  >
                    <Bell />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:inline-flex"
                  asChild
                >
                  <Link to="/contact" aria-label="Help">
                    <Info />
                  </Link>
                </Button>
                <div className="hidden sm:block">
                  <AiToolsMenu />
                </div>
                <ProfileMenu settings={settings} compact page={page} />
              </div>
            </header>
            <main
              id="main-content"
              data-testid="workspace-content-surface"
              tabIndex={-1}
              className="workspace-scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <PageBar
                  tabs={
                    <div className={sidebarOpen ? "lg:hidden" : undefined}>
                      <ContextNavigation page={page} />
                    </div>
                  }
                >
                  {children}
                </PageBar>
              </div>
            </main>
          </section>
          <MobileNavigation
            page={page}
            onOpenChange={setMoreOpen}
            data={navigationData}
            settings={settings}
            onNewProject={onNewProject}
            canCreateProject={canCreateProject}
          />
          <WorkspaceCommand
            open={commandOpen}
            onOpenChange={setCommandOpen}
            onNewProject={onNewProject}
            returnFocusRef={commandReturnFocusRef}
            searchRecords={searchRecords}
          />
        </div>
      </Sheet>
    </BreadcrumbContext.Provider>
  );
}

const SIDEBAR_OPEN_STORAGE_KEY = "relay:sidebar-open";

/**
 * Whether the panel beside the rail is open. Open is the default; the choice
 * is remembered on this device. Read after mount so the server render and the
 * first client render agree.
 */
function useSidebarOpen() {
  const [open, setOpen] = useState(true);
  const touched = useRef(false);
  useEffect(() => {
    // A click before hydration already decided; the stored value must not
    // undo it, which would make the toggle look dead on a slow first paint.
    if (touched.current) return;
    try {
      setOpen(window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY) !== "0");
    } catch {
      // Storage is unavailable; keep the open default.
    }
  }, []);
  const toggle = () => {
    touched.current = true;
    setOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // The toggle still works for this visit.
      }
      return next;
    });
  };
  return [open, toggle] as const;
}

/**
 * Pages listed under a hub in the page bar. The
 * hub's own page comes first and is labelled "Overview".
 */
function hubChildren(hub: ShellPage) {
  return (contextPages[hub] ?? []).flatMap((page) =>
    allRoutes
      .filter((item) => item.page === page)
      .map((item) => (page === hub ? { ...item, label: "Overview" } : item))
  );
}

const markerTransition = { duration: 0.18, ease: [0.2, 0, 0, 1] as const };

function HubItems({
  page,
  data,
  settings,
  onNewProject,
  canCreateProject,
  onNavigate,
  bare = false,
}: {
  page: ShellPage;
  data: WorkspaceNavigationData;
  settings: SettingsState;
  onNewProject: () => void;
  canCreateProject: boolean;
  onNavigate?: () => void;
  /** Drops the outer gap so the list can sit inside another nav section. */
  bare?: boolean;
}) {
  const location = useLocation();
  const markerId = useId();
  const reduceMotion = useHydratedReducedMotion();
  const current = new URL(location.href, "https://relay.local");
  const hub = hubPageForPage(page);
  const groups = buildHubNavigation({ hub, data, settings });
  return (
    <div className={cn("grid content-start", bare ? "gap-3" : "gap-4")}>
      {hub === "projects" && canCreateProject ? (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onNavigate?.();
            onNewProject();
          }}
        >
          <Plus />
          New project
        </Button>
      ) : null}
      {groups.map((group) => (
        <nav key={group.label} aria-label={group.label}>
          <p className="px-2 pb-1 text-meta text-[var(--text-meta)]">
            {group.label}
          </p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const target = new URL(item.href, "https://relay.local");
              const active =
                location.pathname === target.pathname &&
                (!target.hash ||
                  location.hash === target.hash.slice(1) ||
                  (hub === "settings" &&
                    !location.hash &&
                    target.hash === "#workspace")) &&
                [...target.searchParams].every(
                  ([key, value]) => current.searchParams.get(key) === value
                );
              return (
                <li key={item.id}>
                  <HrefLink
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-8 items-center rounded-md px-2 text-body transition-colors duration-(--motion-fast)",
                      active
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-meta)] hover:bg-[var(--surface-fill)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {active ? (
                      <motion.span
                        aria-hidden="true"
                        layoutId={markerId}
                        transition={
                          reduceMotion ? { duration: 0 } : markerTransition
                        }
                        className="pointer-events-none absolute inset-0 rounded-md bg-[var(--surface-active)]"
                      />
                    ) : null}
                    <span className="relative min-w-0 truncate">
                      {item.label}
                    </span>
                  </HrefLink>
                </li>
              );
            })}
          </ul>
          {!group.items.length ? (
            <p className="px-2 py-1 text-meta text-[var(--text-meta)]">
              None yet
            </p>
          ) : null}
        </nav>
      ))}
    </div>
  );
}

/**
 * The page's identity, as a chip at the panel's top-left. It opens the route's
 * own pages when there is more than one, and is a plain label when there is not.
 */
function PageTitleChip({
  page,
  label,
  hub,
  sample,
  pages,
}: {
  page: ShellPage;
  label: string;
  hub?: RouteItem;
  sample: boolean;
  pages: RouteItem[];
}) {
  const hubHref = sample ? "/sample-studio" : (hub?.href ?? "/");
  if (pages.length < 2)
    return (
      <span
        aria-label={`Current location: ${label}`}
        className="flex h-7 items-center rounded-full border border-[var(--border-panel)] px-3 text-body font-medium"
      >
        {label}
      </span>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Current location: ${label}`}
          className="h-7 gap-1 rounded-full border border-[var(--border-panel)] px-3 text-body font-medium"
        >
          {label}
          <ChevronDown className="size-3.5 text-[var(--text-meta)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6}>
        <DropdownMenuItem asChild>
          <Link to={hubHref}>Overview</Link>
        </DropdownMenuItem>
        {pages
          .filter((item) => item.page !== page || item.href !== hubHref)
          .map((item) => (
            <DropdownMenuItem key={item.page} asChild>
              <Link
                to={item.href}
                aria-current={item.page === page ? "page" : undefined}
                className={cn(item.page === page && "bg-[var(--surface-fill)]")}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The one collapse control. It keeps the same slot in every sidebar state. */
function SidebarToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-sidebar-toggle
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          aria-expanded={open}
          aria-controls="workspace-sidebar"
          onClick={() => {
            onToggle();
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLElement>("[data-sidebar-toggle]")
                ?.focus()
            );
          }}
        >
          <PanelLeft />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {open ? "Close sidebar" : "Open sidebar"}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * One sidebar: the routes, then the current route's own pages and records.
 * Collapsed to a 56px strip it is icons only, with the toggle still in the
 * sidebar's first slot.
 */
function DesktopSidebar({
  page,
  open,
  onToggle,
  onNewProject,
  canCreateProject,
  data,
  settings,
}: {
  page: ShellPage;
  open: boolean;
  onToggle: () => void;
  onNewProject: () => void;
  canCreateProject: boolean;
  data: WorkspaceNavigationData;
  settings: SettingsState;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const hub = hubRoutes.find((item) => item.page === hubPageForPage(page));
  const hubLabel = hub?.label ?? "Workspace";
  const pages = hubChildren(hubPageForPage(page));
  return (
    <motion.aside
      id="workspace-sidebar"
      aria-label="Workspace navigation"
      initial={false}
      animate={{ width: open ? 240 : 56 }}
      transition={reduceMotion ? { duration: 0 } : markerTransition}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-[var(--surface-frame)] lg:flex"
    >
      <div className="flex h-(--shell-topbar-height) shrink-0 items-center gap-2 px-3">
        <SidebarToggle open={open} onToggle={onToggle} />
        {open ? (
          <>
            <RelayBrand variant="mark" compact />
            <span className="min-w-0 flex-1 truncate text-section">
              {data.sample ? "Sample studio" : "Relay"}
            </span>
          </>
        ) : null}
      </div>
      <div className="workspace-scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3">
        <nav aria-label="Primary navigation">
          <ul className="grid gap-px">
            {hubRoutes.map((item) => (
              <li key={item.page}>
                <SidebarRoute
                  item={item}
                  active={routeIsActive(page, item)}
                  open={open}
                  reduceMotion={reduceMotion}
                />
              </li>
            ))}
          </ul>
        </nav>
        {open ? (
          <SidebarRouteDetail
            page={page}
            hubLabel={hubLabel}
            pages={pages}
            data={data}
            settings={settings}
            onNewProject={onNewProject}
            canCreateProject={canCreateProject}
          />
        ) : null}
      </div>
      <div className="shrink-0 border-t border-[var(--border-hairline)] p-1.5">
        <ProfileMenu settings={settings} collapsed={!open} page={page} />
      </div>
    </motion.aside>
  );
}

/**
 * The current route's detail: its own pages first, then the records that belong
 * to it (projects in progress, open reviews, settings sections, …). Collapsible,
 * so a long record list never buries the routes above it.
 */
function SidebarRouteDetail({
  page,
  hubLabel,
  pages,
  data,
  settings,
  onNewProject,
  canCreateProject,
  onNavigate,
}: {
  page: ShellPage;
  hubLabel: string;
  pages: RouteItem[];
  data: WorkspaceNavigationData;
  settings: SettingsState;
  onNewProject: () => void;
  canCreateProject: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-3 border-t border-[var(--border-hairline)] pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-7 w-full items-center gap-1.5 rounded-md px-2 text-meta font-medium text-[var(--text-meta)] hover:text-[var(--text-primary)]"
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-(--motion-fast)",
            !open && "-rotate-90"
          )}
        />
        <span className="min-w-0 truncate">{hubLabel}</span>
      </button>
      {open ? (
        <div className="mt-2 grid gap-3">
          {pages.length > 1 ? (
            <nav aria-label={`${hubLabel} navigation`}>
              <ul className="grid gap-px">
                {pages.map((item) => (
                  <li key={item.page}>
                    <HrefLink
                      href={item.href}
                      aria-current={page === item.page ? "page" : undefined}
                      className={cn(
                        "flex min-h-7 items-center rounded-md px-2 pl-7 text-body transition-colors duration-(--motion-fast)",
                        page === item.page
                          ? "bg-[var(--surface-active)] font-medium text-[var(--text-primary)]"
                          : "text-[var(--text-meta)] hover:bg-[var(--surface-fill)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </HrefLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <HubItems
            page={page}
            data={data}
            settings={settings}
            onNewProject={onNewProject}
            canCreateProject={canCreateProject}
            onNavigate={onNavigate}
            bare
          />
        </div>
      ) : null}
    </div>
  );
}

function SidebarRoute({
  item,
  active,
  open,
  reduceMotion,
}: {
  item: RouteItem;
  active: boolean;
  open: boolean;
  reduceMotion: boolean;
}) {
  const Icon = item.icon;
  const aiHere = aiToolsForPage(item.page);
  const link = (
    <Link
      to={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-7 items-center gap-2.5 rounded-md text-body transition-colors duration-(--motion-fast)",
        open ? "px-2" : "mx-auto size-9 justify-center",
        active
          ? "bg-[var(--surface-active)] font-medium text-[var(--text-primary)]"
          : "text-[var(--text-meta)] hover:bg-[var(--surface-fill)] hover:text-[var(--text-primary)]"
      )}
    >
      {active && open ? (
        <motion.span
          aria-hidden="true"
          layoutId="sidebar-active-route"
          transition={reduceMotion ? { duration: 0 } : markerTransition}
          className="absolute inset-0 rounded-md bg-[var(--surface-active)]"
        />
      ) : null}
      <Icon className="relative size-4 shrink-0" />
      {open ? (
        <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
      ) : null}
      {aiHere.length ? (
        <span
          aria-hidden="true"
          data-slot="ai-nav-badge"
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-[var(--text-primary)]",
            !open && "absolute right-1.5 top-1.5"
          )}
        />
      ) : null}
    </Link>
  );
  if (open) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const reduceMotion = useHydratedReducedMotion();
  const name = settings.profileName || "Your profile";
  const handle = settings.profileUsername
    ? `@${settings.profileUsername.replace(/^@/, "")}`
    : settings.teamRole || "Editor";

  return (
    <>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "group flex items-center text-left data-[state=open]:bg-[var(--surface-active)]",
              compact
                ? "h-9 w-9 justify-center p-0"
                : collapsed
                  ? "w-full justify-center p-1"
                  : "w-full gap-2 p-2"
            )}
            aria-label="Open profile menu"
          >
            <Avatar className="size-8">
              <AvatarImage
                src={settings.profileImageUrl || undefined}
                alt={name}
                className="object-cover"
              />
              <AvatarFallback className="bg-[var(--surface-fill)] text-meta font-semibold text-[var(--text-primary)]">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && !compact ? (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta font-semibold">
                    {name}
                  </span>
                  <span className="block truncate text-meta text-[var(--text-primary)]">
                    {handle}
                  </span>
                </span>
                <span className="flex">
                  <ChevronDown className="size-4 text-[var(--text-primary)]" />
                </span>
              </>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={compact ? "bottom" : collapsed ? "right" : "top"}
          align={compact ? "end" : "start"}
          sideOffset={8}
          className="w-72"
        >
          <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2">
            <Avatar className="size-9">
              <AvatarImage
                src={settings.profileImageUrl || undefined}
                alt=""
                className="object-cover"
              />
              <AvatarFallback className="bg-[var(--surface-fill)] text-meta font-semibold text-[var(--text-primary)]">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-body font-semibold">
                {name}
              </span>
              <span className="block truncate text-meta font-normal text-[var(--text-primary)]">
                {handle}
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isSignedIn ? (
            <>
              <DropdownMenuLabel className="text-meta font-normal text-muted-foreground">
                Local Workspace · stored in this browser
              </DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!isAuthEnabled}
                onSelect={() => openSignIn()}
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
              aria-current={
                page === "organization-profile" ? "page" : undefined
              }
              className={cn(page === "organization-profile" && "bg-accent")}
            >
              <UsersRound /> Organization profile
            </Link>
          </DropdownMenuItem>
          {compactSupportLinks.map((link) => (
            <DropdownMenuItem key={link.label} asChild>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noreferrer">
                  <link.icon />
                  {link.label}
                </a>
              ) : (
                <Link to={link.href}>
                  <link.icon />
                  {link.label}
                </Link>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
            <MessageSquarePlus /> Send feedback
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
            <DropdownMenuLabel className="text-meta font-normal text-muted-foreground">
              Sign-in needs Clerk and Convex configuration.
            </DropdownMenuLabel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
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
        className="overflow-hidden p-0 sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Workspace command menu</DialogTitle>
        <div>
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
                          <span className="text-meta text-muted-foreground">
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
        </div>
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
  onOpenChange,
  data,
  settings,
  onNewProject,
  canCreateProject,
}: {
  page: ShellPage;
  onOpenChange: (open: boolean) => void;
  data: WorkspaceNavigationData;
  settings: SettingsState;
  onNewProject: () => void;
  canCreateProject: boolean;
}) {
  const hub = hubRoutes.find((item) => item.page === hubPageForPage(page));
  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(var(--shell-mobile-nav-height)+env(safe-area-inset-bottom))] grid-cols-5 bg-[var(--surface-frame)] px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mobileRoutes.map((item) => {
          const Icon = item.icon;
          const active = routeIsActive(page, item);
          return (
            <Link
              key={item.page}
              to={item.href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 items-center justify-center rounded-md text-meta font-medium text-[var(--text-primary)]"
            >
              <span
                className={cn(
                  "flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-md py-2",
                  active && "bg-[var(--surface-active)]"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <SheetContent side="bottom" className="overflow-y-auto p-4 lg:hidden">
        <SheetHeader>
          <SheetTitle>{hub?.label ?? "Workspace"}</SheetTitle>
        </SheetHeader>
        <SidebarRouteDetail
          page={page}
          hubLabel={hub?.label ?? "Workspace"}
          pages={hubChildren(hubPageForPage(page))}
          data={data}
          settings={settings}
          onNewProject={onNewProject}
          canCreateProject={canCreateProject}
          onNavigate={() => onOpenChange(false)}
        />
        <nav
          aria-label="Other workspace hubs"
          className="mt-4 flex flex-wrap gap-2"
        >
          {hubRoutes
            .filter((item) => !mobileRoutes.includes(item))
            .map((item) => (
              <Button key={item.page} variant="ghost" asChild>
                <Link to={item.href} onClick={() => onOpenChange(false)}>
                  {item.label}
                </Link>
              </Button>
            ))}
        </nav>
      </SheetContent>
    </>
  );
}
