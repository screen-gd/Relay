"use client";

import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare2,
  ChevronDown,
  ChevronLeft,
  CircleUserRound,
  FolderKanban,
  Images,
  LayoutDashboard,
  Library,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAppAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import type { SettingsState } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ShellPage =
  | "dashboard"
  | "projects"
  | "clients"
  | "timeline"
  | "calendar"
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
  | "profile"
  | "profile-edit"
  | "organization-profile";

type RouteItem = {
  page: ShellPage;
  label: string;
  href: string;
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
      { page: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, shortcut: "G D" },
      { page: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays, shortcut: "G C" },
      { page: "timeline", label: "Timeline", href: "/timeline", icon: Workflow },
    ],
  },
  {
    label: "Work",
    items: [
      { page: "projects", label: "Projects", href: "/projects", icon: FolderKanban, shortcut: "G P" },
      { page: "clients", label: "Clients", href: "/clients", icon: UsersRound },
      { page: "feedback", label: "Reviews", href: "/feedback", icon: MessageSquareText },
      { page: "media", label: "Media", href: "/media", icon: Images },
      { page: "templates", label: "Templates", href: "/templates", icon: CheckSquare2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { page: "resources", label: "Resources", href: "/resources", icon: Library },
      { page: "integrations", label: "Integrations", href: "/integrations", icon: Sparkles },
      { page: "reports", label: "Reports", href: "/reports", icon: ChartNoAxesCombined, shortcut: "G R" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { page: "team", label: "Team", href: "/team", icon: Users },
      { page: "team-chat", label: "Team chat", href: "/team-chat", icon: MessageSquareText },
      { page: "settings", label: "Settings", href: "/settings", icon: Settings, shortcut: "G S" },
    ],
  },
];

const allRoutes = routeGroups.flatMap((group) => group.items);

const mobileRoutes: RouteItem[] = [
  allRoutes.find((route) => route.page === "dashboard")!,
  allRoutes.find((route) => route.page === "projects")!,
  allRoutes.find((route) => route.page === "calendar")!,
  allRoutes.find((route) => route.page === "clients")!,
];

const shellTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

const quickRouteShortcuts: Record<string, string> = {
  d: "/",
  c: "/calendar",
  p: "/projects",
  r: "/reports",
  s: "/settings",
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CL";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function routeIsActive(currentPage: ShellPage, item: RouteItem) {
  if (currentPage === item.page) return true;
  if (item.page === "projects") return ["projects"].includes(currentPage);
  if (item.page === "clients") return currentPage === "clients";
  if (item.page === "media") return currentPage === "media";
  if (item.page === "team") return currentPage === "team";
  if (item.page === "settings") return ["settings", "account"].includes(currentPage);
  return false;
}

export function WorkspaceShell({
  page,
  settings,
  collapsed,
  onToggle,
  onNewProject,
  canCreateProject,
  notificationSlot,
  children,
}: {
  page: ShellPage;
  settings: SettingsState;
  collapsed: boolean;
  onToggle: () => void;
  onNewProject: () => void;
  canCreateProject: boolean;
  notificationSlot?: ReactNode;
  children: ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const goChordRef = useRef(false);
  const goChordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useHydratedReducedMotion();
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
        return;
      }

      const target = event.target as HTMLElement | null;
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
          router.push(href);
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
  }, [router]);

  const title = useMemo(
    () => allRoutes.find((route) => route.page === page)?.label ?? "CutLab Studio",
    [page],
  );

  return (
    <div className="min-h-dvh bg-[var(--app-canvas)] text-[var(--app-ink)]">
      <DesktopSidebar page={page} settings={settings} collapsed={collapsed} onToggle={onToggle} />

      <div
        className={cn(
          "min-h-dvh transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[224px]",
        )}
      >
        <header
          className={cn(
            "fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-panel)_92%,transparent)] px-3 backdrop-blur-xl transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:justify-between",
            collapsed ? "lg:left-[76px]" : "lg:left-[224px]",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
            <div className="flex items-center gap-2 lg:hidden">
              <img
                src="/brand/logo/cutlab-studio.png"
                alt="CutLab Studio"
                className="h-7 w-auto object-contain brightness-0 dark:brightness-100"
              />
            </div>
            <p className="truncate text-sm font-semibold lg:hidden">{title}</p>
          </div>

          <Button
            variant="outline"
            className={cn(
              "hidden h-9 w-[540px] justify-start border-[var(--app-border)] bg-[var(--app-control)] px-3 text-[var(--app-muted)] shadow-none transition-[left,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--app-strong-border)] hover:bg-[var(--app-soft-panel)] hover:shadow-[0_1px_2px_color-mix(in_srgb,var(--app-ink)_8%,transparent)] lg:absolute lg:flex lg:-translate-x-1/2",
              collapsed ? "lg:left-[calc(50vw-76px)]" : "lg:left-[calc(50vw-224px)]",
            )}
            onClick={() => setCommandOpen(true)}
          >
            <Search className="size-4" />
            <span className="truncate">Search pages and workspace actions</span>
            <kbd className="ml-auto rounded border border-[var(--app-border)] bg-[var(--app-soft-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--app-muted)]">
              Ctrl K
            </kbd>
          </Button>

          <div className="ml-3 flex items-center gap-1.5 lg:ml-0">
            <motion.div
              whileHover={canCreateProject && !reduceMotion ? { y: -1 } : undefined}
              whileTap={canCreateProject && !reduceMotion ? { scale: 0.98, y: 0 } : undefined}
              transition={{ duration: 0.12 }}
              className="hidden sm:block"
            >
              <Button
                className="h-9 bg-[var(--app-accent)] px-3.5 text-white shadow-none hover:bg-[var(--app-highlight)]"
                onClick={onNewProject}
                disabled={!canCreateProject}
              >
                <Plus className="size-4" />
                New project
              </Button>
            </motion.div>
            {notificationSlot ?? (
              <motion.div whileTap={reduceMotion ? undefined : { scale: 0.92 }} transition={{ duration: 0.1 }}>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="size-[18px]" />
                </Button>
              </motion.div>
            )}
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="h-[calc(100dvh_-_68px_-_env(safe-area-inset-bottom))] overflow-y-auto pt-14 outline-none lg:h-auto lg:min-h-[calc(100dvh-56px)] lg:overflow-visible">
          {children}
        </main>
      </div>

      <MobileNavigation page={page} open={moreOpen} onOpenChange={setMoreOpen} />
      <WorkspaceCommand open={commandOpen} onOpenChange={setCommandOpen} onNewProject={onNewProject} />
    </div>
  );
}

function DesktopSidebar({
  page,
  settings,
  collapsed,
  onToggle,
}: {
  page: ShellPage;
  settings: SettingsState;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 224 }}
      transition={reduceMotion ? { duration: 0 } : shellTransition}
      className="fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-[var(--app-border)] bg-[var(--app-sidebar)] lg:flex lg:flex-col"
    >
      <div className={cn(
        "border-b border-[var(--app-border)]",
        collapsed ? "grid h-[104px] grid-rows-[42px_28px] justify-items-center gap-1 px-2 py-6" : "flex h-[104px] items-start justify-between gap-3 px-5 pt-6",
      )}>
        <Link
          href="/"
          aria-label="Go to dashboard"
          className={cn(
            "min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-sidebar)]",
            collapsed ? "flex w-[60px] items-center justify-center overflow-hidden" : "flex-1",
          )}
        >
          <motion.img
            initial={false}
            animate={{
              opacity: collapsed ? 0.75 : 1,
              height: collapsed ? 16 : 48,
              maxWidth: collapsed ? 58 : 178,
            }}
            transition={reduceMotion ? { duration: 0 } : shellTransition}
            src="/brand/logo/cutlab-studio.png"
            alt="CutLab Studio"
            className={cn(
              "w-auto object-contain brightness-0 dark:brightness-100",
              collapsed ? "object-center" : "object-left",
            )}
          />
        </Link>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              type="button"
              whileHover={reduceMotion ? undefined : { x: collapsed ? 1 : -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={reduceMotion ? { duration: 0 } : shellTransition}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-md outline-none transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]",
                collapsed
                  ? "size-7 text-[var(--app-muted)] hover:bg-[var(--app-active)] hover:text-[var(--app-highlight)] focus-visible:bg-[var(--app-active)] focus-visible:text-[var(--app-highlight)]"
                  : "mt-1 size-7 text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)]",
              )}
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              <ChevronLeft className="size-4" strokeWidth={2.1} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
        </Tooltip>
      </div>

      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {routeGroups.map((group, groupIndex) => (
          <div key={group.label} className="mb-4">
            {!collapsed ? (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : shellTransition}
                className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]"
              >
                {group.label}
              </motion.p>
            ) : (
              <div className="mb-1.5 flex h-3.5 items-center justify-center" aria-hidden="true">
                {groupIndex > 0 ? <span className="h-px w-10 bg-[var(--app-border)]" /> : null}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarRoute
                  key={item.page}
                  item={item}
                  active={routeIsActive(page, item)}
                  collapsed={collapsed}
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--app-border)] p-2">
        <ProfileMenu settings={settings} collapsed={collapsed} page={page} />
      </div>
    </motion.aside>
  );
}


function SidebarRoute({
  item,
  active,
  collapsed,
  reduceMotion,
}: {
  item: RouteItem;
  active: boolean;
  collapsed: boolean;
  reduceMotion: boolean | null;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center overflow-hidden rounded-md text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset",
        collapsed ? "mx-auto w-10 justify-center px-0" : "gap-2.5 px-2.5",
        active
          ? "text-[var(--app-highlight)]"
          : "text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)]",
      )}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-active-route"
          transition={reduceMotion ? { duration: 0 } : shellTransition}
          className="absolute inset-0 rounded-md bg-[var(--app-active)]"
        />
      ) : null}
      <motion.span
        animate={{ scale: active && !reduceMotion ? 1.04 : 1 }}
        transition={reduceMotion ? { duration: 0 } : shellTransition}
        className="relative z-10 flex shrink-0"
      >
        <Icon className="size-[17px]" strokeWidth={active ? 2.1 : 1.8} />
      </motion.span>
      {!collapsed ? (
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : shellTransition}
          className="relative z-10 truncate"
        >
          {item.label}
        </motion.span>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function ProfileMenu({ settings, collapsed, page }: { settings: SettingsState; collapsed: boolean; page: ShellPage }) {
  const { isAuthEnabled } = useData();
  const { isSignedIn, openSignIn, openSignUp, signOut } = useAppAuth();
  const [open, setOpen] = useState(false);
  const reduceMotion = useHydratedReducedMotion();
  const name = settings.profileName || "Your profile";
  const handle = settings.profileUsername ? `@${settings.profileUsername.replace(/^@/, "")}` : settings.teamRole || "Editor";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          whileHover={reduceMotion ? undefined : { y: -1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97, y: 0 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "flex w-full items-center rounded-md text-left outline-none transition-[background-color,box-shadow] hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]",
            collapsed ? "justify-center p-1" : "gap-2.5 p-2",
          )}
          aria-label="Open profile menu"
        >
          <Avatar className="size-8 border border-[var(--app-border)]">
            <AvatarImage src={settings.profileImageUrl || undefined} alt="" />
            <AvatarFallback className="bg-[var(--app-avatar-surface)] text-[11px] font-semibold text-[var(--app-ink)]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{name}</span>
                <span className="block truncate text-[11px] text-[var(--app-muted)]">{handle}</span>
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.16 }}
                className="flex"
              >
                <ChevronDown className="size-3.5 text-[var(--app-muted)]" />
              </motion.span>
            </>
          ) : null}
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "top"} align="start" className="w-64">
        <DropdownMenuLabel>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs font-normal text-muted-foreground">{handle}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            aria-current={page === "profile" ? "page" : undefined}
            className={cn(page === "profile" && "bg-accent")}
          >
            <CircleUserRound /> Public profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/organization"
            aria-current={page === "organization-profile" ? "page" : undefined}
            className={cn(page === "organization-profile" && "bg-accent")}
          >
            <UsersRound /> Organization profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/profile/edit"
            aria-current={page === "profile-edit" ? "page" : undefined}
            className={cn(page === "profile-edit" && "bg-accent")}
          >
            <Sparkles /> Edit profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account"
            aria-current={page === "account" ? "page" : undefined}
            className={cn(page === "account" && "bg-accent")}
          >
            <Settings /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAuthEnabled ? (
          isSignedIn ? (
            <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => openSignIn()}>Sign in</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openSignUp()}>Create account</DropdownMenuItem>
            </>
          )
        ) : (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Local mode is active on this device.
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewProject: () => void;
}) {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-[var(--app-strong-border)] p-0 shadow-[0_24px_80px_color-mix(in_srgb,var(--app-ink)_18%,transparent)] sm:max-w-[620px]">
        <DialogTitle className="sr-only">Workspace command menu</DialogTitle>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Command>
            <CommandInput aria-label="Search workspace commands" placeholder="Search pages and actions..." />
            <CommandList className="max-h-[420px]">
              <CommandEmpty>No matching workspace action found.</CommandEmpty>
              <CommandGroup heading="Quick actions">
                <CommandItem
                  onSelect={() => {
                    onOpenChange(false);
                    onNewProject();
                  }}
                >
                  <Plus /> Create new project
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              {routeGroups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem key={item.page} asChild>
                        <Link href={item.href} onClick={() => onOpenChange(false)}>
                          <Icon />
                          {item.label}
                          {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
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

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(68px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-panel)_94%,transparent)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      {mobileRoutes.map((item) => {
        const Icon = item.icon;
        const active = routeIsActive(page, item);
        return (
          <Link
            key={item.page}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset",
              active ? "text-[var(--app-highlight)]" : "text-[var(--app-muted)]",
            )}
          >
            {active ? (
              <motion.span
                layoutId="mobile-active-route"
                transition={reduceMotion ? { duration: 0 } : shellTransition}
                className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--app-accent)]"
              />
            ) : null}
            <motion.span
              whileTap={reduceMotion ? undefined : { scale: 0.88 }}
              className="flex flex-col items-center justify-center gap-1"
            >
              <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </motion.span>
          </Link>
        );
      })}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            className="flex flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium text-[var(--app-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset"
            aria-label="Open more workspace pages"
          >
            <motion.span
              animate={{ rotate: open ? 90 : 0, scale: open && !reduceMotion ? 1.06 : 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              className="flex"
            >
              <MoreHorizontal className="size-[19px]" />
            </motion.span>
            More
          </motion.button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[82dvh] rounded-t-xl px-3 pb-8">
          <SheetHeader className="px-1">
            <SheetTitle>Workspace</SheetTitle>
          </SheetHeader>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {allRoutes.filter((route) => !mobileRoutes.some((mobile) => mobile.page === route.page)).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  aria-current={routeIsActive(page, item) ? "page" : undefined}
                  className="group flex items-center gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-sm font-medium outline-none transition-[background-color,border-color] hover:border-[var(--app-strong-border)] hover:bg-[var(--app-soft-panel)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  <motion.span
                    whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                    className="flex"
                  >
                    <Icon className="size-[18px] text-[var(--app-muted)] transition-colors group-hover:text-[var(--app-ink)]" />
                  </motion.span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
