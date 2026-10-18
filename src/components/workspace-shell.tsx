import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Compose,
  FileText,
  HelpCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  Sun,
  UserPlus,
} from "@/components/icons";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { motion } from "motion/react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  createContext,
  useCallback,
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
import type { SearchRecord } from "@/features/workspace-discovery/workspace-discovery";
import { FeedbackDialog } from "@/features/feedback/feedback-button";
import { useAiAccount } from "@/features/ai/ai-availability";
import { aiToolHref, aiTools, featuredAiToolIds } from "@/features/ai/ai-tools";
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
import { Kbd } from "@/components/ui/kbd";
import { PageHeaderContext } from "@/components/workspace-page/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  allRoutes,
  commandGroups,
  goShortcuts,
  isSettingsPage,
  primaryRoutes,
  routes,
  settingsNavGroups,
  settingsNavSection,
  settingsSections,
  isSettingsSection,
  sidebarPageFor,
  sidebarSections,
  supportLinks,
  viewGroupFor,
  type RouteItem,
  type ShellPage,
} from "./workspace-navigation";

export { workspacePageForPath } from "./workspace-navigation";
export type { ShellPage } from "./workspace-navigation";

type ThemeChoice = SettingsState["theme"];

const BreadcrumbContext = createContext<(label: string | null) => void>(
  () => {}
);

/**
 * Shows `label` after the page name in the top bar while the calling page is
 * mounted, e.g. a project's title on its detail page.
 */
export function useWorkspaceBreadcrumb(label: string) {
  const setBreadcrumb = useContext(BreadcrumbContext);
  useEffect(() => {
    setBreadcrumb(label);
    return () => setBreadcrumb(null);
  }, [label, setBreadcrumb]);
}

const SIDEBAR_OPEN_STORAGE_KEY = "relay:sidebar-open";
const SIDEBAR_SECTIONS_STORAGE_KEY = "relay:sidebar-sections";
const RECENT_PROJECT_LIMIT = 5;

/**
 * The signed-in workspace frame, laid out as Linear does: a sidebar on the
 * dark canvas and the page in a framed viewport beside it. The sidebar's
 * toggle (or `[`) folds it to an icon rail; under 1024px it becomes a sheet
 * behind the menu button. The top bar names the page, offers its views and
 * holds the page's actions, so every page puts its options in one place.
 */
export function WorkspaceShell({
  page,
  settings,
  onNewProject,
  canCreateProject,
  onThemeChange,
  pageTitle,
  notificationSlot,
  searchRecords = [],
  children,
}: {
  page: ShellPage;
  settings: SettingsState;
  onNewProject: () => void;
  canCreateProject: boolean;
  /** Saves a theme picked from the workspace menu. */
  onThemeChange?: (theme: ThemeChoice) => void;
  pageTitle?: string;
  notificationSlot?: ReactNode;
  searchRecords?: readonly SearchRecord[];
  children: ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null);
  const [sidebarOpen, toggleSidebar] = useSidebarOpen();
  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null);
  const pageHeaderContext = useMemo(
    () => ({ actionsHost, inShell: true }),
    [actionsHost]
  );
  const commandReturnFocusRef = useRef<HTMLElement | null>(null);
  const pathname = useLocation({ select: (location) => location.pathname });

  const openCommand = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      commandReturnFocusRef.current = document.activeElement;
    }
    setCommandOpen(true);
  }, []);

  useWorkspaceShortcuts({
    commandOpen,
    setCommandOpen,
    openCommand,
    toggleSidebar,
    onNewProject: canCreateProject ? onNewProject : undefined,
  });

  // A route change closes the mobile sheet behind the link that was used.
  useEffect(() => setMobileOpen(false), [pathname]);

  const sidebar = (mode: SidebarMode) => (
    <Sidebar
      mode={mode}
      page={page}
      settings={settings}
      onToggle={mode === "sheet" ? () => setMobileOpen(false) : toggleSidebar}
      onNewProject={onNewProject}
      canCreateProject={canCreateProject}
      onSearch={openCommand}
      onThemeChange={onThemeChange}
      notificationSlot={notificationSlot}
      searchRecords={searchRecords}
    />
  );

  return (
    <BreadcrumbContext.Provider value={setBreadcrumb}>
      <div
        data-testid="workspace-shell"
        data-sidebar={sidebarOpen ? "open" : "rail"}
        className="flex h-dvh overflow-hidden bg-canvas text-text-1"
      >
        <div
          className={cn(
            "hidden shrink-0 overflow-hidden transition-[width] duration-(--dur-slow) ease-(--ease-step) motion-reduce:transition-none lg:block",
            sidebarOpen ? "w-(--sidebar)" : "w-(--sidebar-rail)"
          )}
        >
          {sidebar(sidebarOpen ? "expanded" : "rail")}
        </div>

        <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pe-2">
          <div
            data-slot="workspace-viewport"
            className="flex min-h-0 flex-1 flex-col bg-page lg:rounded-frame lg:shadow-[0_0_0_1px_var(--line-frame)]"
          >
            <TopBar
              page={page}
              pathname={pathname}
              title={pageTitle}
              breadcrumb={breadcrumb}
              onMenu={() => setMobileOpen(true)}
              onActionsHost={setActionsHost}
              onNewProject={canCreateProject ? onNewProject : undefined}
            />
            <main
              id="main-content"
              data-testid="workspace-content-surface"
              tabIndex={-1}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
            >
              <PageHeaderContext.Provider value={pageHeaderContext}>
                <div className="flex min-h-full flex-col lg:h-full">
                  {children}
                </div>
              </PageHeaderContext.Provider>
            </main>
          </div>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[min(var(--sidebar),85vw)] gap-0 bg-canvas p-0 lg:hidden"
          >
            <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
            {sidebar("sheet")}
          </SheetContent>
        </Sheet>

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

/**
 * App-wide keys: Ctrl/Cmd+K opens search, `[` folds the sidebar, `C` starts a
 * project, and G then a letter jumps to a page. Keys typed into a field, or
 * pressed while a dialog is open, are left alone.
 */
function useWorkspaceShortcuts({
  commandOpen,
  setCommandOpen,
  openCommand,
  toggleSidebar,
  onNewProject,
}: {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  openCommand: () => void;
  toggleSidebar: () => void;
  onNewProject?: () => void;
}) {
  const navigate = useNavigate();
  const goChordRef = useRef(false);
  const goChordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;

      const key = event.key.toLowerCase();
      if (goChordRef.current) {
        goChordRef.current = false;
        if (goChordTimerRef.current) clearTimeout(goChordTimerRef.current);
        const href = goShortcuts[key];
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
      } else if (event.key === "[") {
        event.preventDefault();
        toggleSidebar();
      } else if (key === "c" && onNewProject) {
        event.preventDefault();
        onNewProject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (goChordTimerRef.current) clearTimeout(goChordTimerRef.current);
    };
  }, [
    commandOpen,
    navigate,
    onNewProject,
    openCommand,
    setCommandOpen,
    toggleSidebar,
  ]);
}

/**
 * Whether the sidebar is open beside the page or folded to the rail. Open is
 * the default and the choice is kept on this device. Read after mount so the
 * server render and the first client render agree.
 */
function useSidebarOpen() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY) !== "0");
    } catch {
      // Storage is unavailable; keep the open default.
    }
  }, []);
  const toggle = useCallback(
    () =>
      setOpen((current) => {
        const next = !current;
        try {
          window.localStorage.setItem(
            SIDEBAR_OPEN_STORAGE_KEY,
            next ? "1" : "0"
          );
        } catch {
          // The toggle still works for this visit.
        }
        return next;
      }),
    []
  );
  return [open, toggle] as const;
}

/** Which sidebar groups are folded, remembered on this device. */
function useFoldedSections() {
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY);
      if (saved) setFolded(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      // Keep every group open.
    }
  }, []);
  const toggle = useCallback((id: string) => {
    setFolded((current) => {
      const next = { ...current, [id]: !current[id] };
      try {
        window.localStorage.setItem(
          SIDEBAR_SECTIONS_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Folding still works for this visit.
      }
      return next;
    });
  }, []);
  return [folded, toggle] as const;
}

type SidebarMode = "expanded" | "rail" | "sheet";

type SidebarProps = {
  mode: SidebarMode;
  page: ShellPage;
  settings: SettingsState;
  onToggle: () => void;
  onNewProject: () => void;
  canCreateProject: boolean;
  onSearch: () => void;
  onThemeChange?: (theme: ThemeChoice) => void;
  notificationSlot?: ReactNode;
  searchRecords: readonly SearchRecord[];
};

/**
 * The navigation column. `expanded` and `sheet` show labels and groups;
 * `rail` shows one icon per page with its name in a tooltip. On a settings
 * page the column swaps to the settings groups, with a way back.
 */
function Sidebar(props: SidebarProps) {
  const { mode, page } = props;
  const rail = mode === "rail";
  const settingsMode = isSettingsPage(page) && !rail;

  return (
    <aside
      aria-label="Sidebar"
      data-mode={mode}
      className={cn(
        "flex h-full flex-col bg-canvas",
        rail
          ? "w-(--sidebar-rail) items-center"
          : "w-(--sidebar) min-w-(--sidebar) max-w-full"
      )}
    >
      {settingsMode ? (
        <SettingsSidebar page={page} />
      ) : (
        <WorkspaceSidebar {...props} />
      )}
      <SidebarFooter
        rail={rail}
        sheet={mode === "sheet"}
        onToggle={props.onToggle}
      />
    </aside>
  );
}

function WorkspaceSidebar({
  mode,
  page,
  settings,
  onNewProject,
  canCreateProject,
  onSearch,
  onThemeChange,
  notificationSlot,
  searchRecords,
}: SidebarProps) {
  const rail = mode === "rail";
  const [folded, toggleFolded] = useFoldedSections();
  const activePage = sidebarPageFor(page);
  const recentProjects = searchRecords
    .filter((record) => record.kind === "project" && record.href)
    .slice(0, RECENT_PROJECT_LIMIT);

  return (
    <>
      <div
        className={cn(
          "flex w-full shrink-0 gap-1 pt-3 pb-2",
          rail ? "flex-col items-center px-1.5" : "items-center px-2"
        )}
      >
        <WorkspaceMenu
          settings={settings}
          rail={rail}
          page={page}
          onThemeChange={onThemeChange}
        />
        <div
          className={cn(
            "flex shrink-0 gap-0.5",
            rail ? "mt-1 flex-col items-center" : "ms-auto items-center"
          )}
        >
          {notificationSlot}
          <IconAction
            label="Search"
            shortcut="Ctrl K"
            side={rail ? "right" : "bottom"}
            onClick={onSearch}
          >
            <Search />
          </IconAction>
          {canCreateProject ? (
            <IconAction
              label="New project"
              shortcut="C"
              side={rail ? "right" : "bottom"}
              onClick={onNewProject}
            >
              <Compose />
            </IconAction>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Primary navigation"
        className={cn(
          "scrollbar-none flex min-h-0 w-full flex-1 flex-col overflow-y-auto pb-3",
          rail ? "items-center px-1.5" : "px-2"
        )}
      >
        <ul className={cn("flex flex-col gap-px", rail && "items-center")}>
          {primaryRoutes.map((item) => (
            <li key={item.page}>
              <NavItem
                item={item}
                active={activePage === item.page}
                rail={rail}
              />
            </li>
          ))}
        </ul>

        {sidebarSections.map((section) =>
          rail ? (
            <ul
              key={section.id}
              aria-label={section.label}
              className="mt-2 flex flex-col items-center gap-px pt-2 shadow-[inset_0_1px_0_var(--line-row)]"
            >
              {section.items.map((item) => (
                <li key={item.page}>
                  <NavItem item={item} active={activePage === item.page} rail />
                </li>
              ))}
            </ul>
          ) : (
            <NavGroup
              key={section.id}
              label={section.label}
              open={!folded[section.id]}
              onOpenChange={() => toggleFolded(section.id)}
            >
              {section.items.map((item) => (
                <li key={item.page}>
                  <NavItem item={item} active={activePage === item.page} />
                </li>
              ))}
            </NavGroup>
          )
        )}

        {rail ? null : (
          <>
            <NavGroup
              label="AI tools"
              open={!folded.ai}
              onOpenChange={() => toggleFolded("ai")}
            >
              <AiToolLinks onMore={onSearch} onNewProject={onNewProject} />
            </NavGroup>
            {recentProjects.length ? (
              <NavGroup
                label="Recent"
                open={!folded.recent}
                onOpenChange={() => toggleFolded("recent")}
              >
                {recentProjects.map((record) => (
                  <li key={record.id}>
                    <HrefLink
                      href={record.href ?? "/projects"}
                      className={navItemClassName(false)}
                    >
                      <FileText />
                      <span className="min-w-0 truncate">{record.title}</span>
                    </HrefLink>
                  </li>
                ))}
              </NavGroup>
            ) : null}
          </>
        )}
      </nav>
    </>
  );
}

/** The settings mode of the sidebar: settings grouped by what they are about. */
function SettingsSidebar({ page }: { page: ShellPage }) {
  const search = useSearch({ strict: false }) as { section?: string };
  const activeSection =
    page === "settings"
      ? settingsNavSection(
          isSettingsSection(search.section) ? search.section : undefined
        )
      : null;

  return (
    <>
      <div className="flex w-full shrink-0 items-center px-2 pt-3 pb-2">
        <Link
          to="/"
          className="flex h-(--control) items-center gap-2 rounded-soft px-2.5 type-label text-text-2 transition-colors duration-(--dur-fast) hover:bg-hover hover:text-text-1"
        >
          <ArrowLeft className="size-4" />
          Back to workspace
        </Link>
      </div>
      <nav
        aria-label="Settings navigation"
        className="scrollbar-none flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-2 pb-3"
      >
        {settingsNavGroups.map((group) => (
          <NavGroup key={group.label} label={group.label} open>
            {group.items.map((entry) =>
              entry.kind === "section" ? (
                <li key={entry.id}>
                  <Link
                    to="/settings"
                    search={{ section: entry.id }}
                    aria-current={
                      activeSection === entry.id ? "page" : undefined
                    }
                    className={navItemClassName(activeSection === entry.id)}
                  >
                    <span className="min-w-0 truncate">{entry.label}</span>
                  </Link>
                </li>
              ) : (
                <li key={entry.item.page}>
                  <Link
                    to={entry.item.href}
                    aria-current={page === entry.item.page ? "page" : undefined}
                    className={navItemClassName(page === entry.item.page)}
                  >
                    <span className="min-w-0 truncate">{entry.item.label}</span>
                  </Link>
                </li>
              )
            )}
          </NavGroup>
        ))}
      </nav>
    </>
  );
}

function navItemClassName(active: boolean, rail = false) {
  return cn(
    "group/nav relative flex items-center gap-2.5 rounded-soft type-label outline-none select-none",
    "transition-colors duration-(--dur-fast) ease-(--ease-step) focus-visible:focus-ring-inset",
    "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-(--dur-fast)",
    rail ? "size-9 justify-center" : "h-7 w-full px-2.5 text-start",
    active
      ? "bg-selected text-text-1 [&_svg]:text-text-1"
      : "text-text-2 hover:bg-hover hover:text-text-1 [&_svg]:text-text-3 hover:[&_svg]:text-text-2"
  );
}

/** One page in the sidebar. In the rail it is an icon with a tooltip name. */
function NavItem({
  item,
  active,
  rail = false,
}: {
  item: RouteItem;
  active: boolean;
  rail?: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      to={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={navItemClassName(active, rail)}
    >
      <Icon />
      {rail ? null : <span className="min-w-0 truncate">{item.label}</span>}
    </Link>
  );
  if (!rail) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/** A foldable sidebar group: a quiet label with a caret, then its rows. */
function NavGroup({
  label,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  open: boolean;
  onOpenChange?: () => void;
  children: ReactNode;
}) {
  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className="mt-4"
    >
      <CollapsiblePrimitive.Trigger
        disabled={!onOpenChange}
        className="group/group flex h-6 items-center gap-1 rounded-inner px-2.5 type-label-sm text-text-3 transition-colors duration-(--dur-fast) hover:text-text-2 focus-visible:focus-ring-inset disabled:cursor-default disabled:hover:text-text-3"
      >
        {label}
        {onOpenChange ? (
          <ChevronDown className="size-3 transition-transform duration-(--dur-base) ease-(--ease-step) group-data-[state=closed]/group:-rotate-90" />
        ) : null}
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <ul className="flex flex-col gap-px pt-0.5">{children}</ul>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

/** The featured AI actions, then the full list through search. */
function AiToolLinks({
  onMore,
  onNewProject,
}: {
  onMore: () => void;
  onNewProject: () => void;
}) {
  const { hasAccount } = useAiAccount();
  const pathname = useLocation({ select: (location) => location.pathname });
  const featured = aiTools.filter((tool) =>
    featuredAiToolIds.includes(tool.id as (typeof featuredAiToolIds)[number])
  );
  const Icon = hasAccount ? Sparkles : LockKeyhole;
  return (
    <>
      {featured.map((tool) => (
        <li key={tool.id}>
          {tool.id === "brief-import" ? (
            <button
              type="button"
              onClick={onNewProject}
              className={navItemClassName(false)}
            >
              <Icon />
              <span className="min-w-0 truncate">{tool.label}</span>
            </button>
          ) : (
            <HrefLink
              href={aiToolHref(tool, pathname)}
              className={navItemClassName(false)}
            >
              <Icon />
              <span className="min-w-0 truncate">{tool.label}</span>
            </HrefLink>
          )}
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={onMore}
          className={navItemClassName(false)}
        >
          <Plus />
          <span className="min-w-0 truncate">All AI tools</span>
        </button>
      </li>
    </>
  );
}

/** A sidebar icon button, named on hover with its shortcut. */
function IconAction({
  label,
  shortcut,
  side,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  side: "right" | "bottom";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** Help, plans and the sidebar toggle, pinned to the bottom. */
function SidebarFooter({
  rail,
  sheet,
  onToggle,
}: {
  rail: boolean;
  sheet: boolean;
  onToggle: () => void;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const toggleLabel = sheet
    ? "Close menu"
    : rail
      ? "Open sidebar"
      : "Close sidebar";
  const side = rail ? "right" : "top";
  return (
    <div
      className={cn(
        "flex w-full shrink-0 gap-0.5 pb-3",
        rail ? "flex-col items-center px-1.5" : "items-center px-2"
      )}
    >
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Help and feedback"
              >
                <HelpCircle />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side={side}>Help and feedback</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side={side} align="start" className="w-56">
          <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
            Send feedback
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <nav aria-label="Support and legal">
            {supportLinks.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link to={link.href}>{link.label}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href={`${marketingSiteUrl}/about`}
                target="_blank"
                rel="noreferrer"
              >
                About Relay
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`${marketingSiteUrl}/privacy-and-data`}
                target="_blank"
                rel="noreferrer"
              >
                Privacy and data
              </a>
            </DropdownMenuItem>
          </nav>
        </DropdownMenuContent>
      </DropdownMenu>
      {rail ? null : (
        <Link
          to="/subscription"
          className="flex h-(--control-sm) items-center rounded-soft px-2 type-label-sm text-text-2 shadow-[inset_0_0_0_1px_var(--line-control)] transition-colors duration-(--dur-fast) hover:bg-hover hover:text-text-1"
        >
          Plans
        </Link>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={rail ? undefined : "ms-auto"}
            aria-label={toggleLabel}
            aria-expanded={!rail}
            onClick={onToggle}
          >
            <PanelLeft />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side}>
          {toggleLabel}
          {sheet ? null : <Kbd>[</Kbd>}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "R";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * The workspace and account menu at the top of the sidebar: who is signed in,
 * settings and the account pages, the theme, and sign in or out.
 */
function WorkspaceMenu({
  settings,
  rail,
  page,
  onThemeChange,
}: {
  settings: SettingsState;
  rail: boolean;
  page: ShellPage;
  onThemeChange?: (theme: ThemeChoice) => void;
}) {
  const { isAuthEnabled } = useData();
  const { isSignedIn, openSignIn, openSignUp, signOut } = useOptionalAuth();
  const workspaceName = settings.studioName || "Relay";
  const name = settings.profileName || "Your profile";
  const handle = settings.profileUsername
    ? `@${settings.profileUsername.replace(/^@/, "")}`
    : settings.teamRole || "Editor";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open workspace menu"
          className={cn(
            "group/menu flex min-w-0 items-center gap-2 rounded-soft outline-none transition-colors duration-(--dur-fast) hover:bg-hover focus-visible:focus-ring-inset data-[state=open]:bg-selected",
            rail ? "size-9 justify-center" : "h-(--control) flex-1 px-1.5"
          )}
        >
          <Avatar className="size-5 rounded-inner">
            <AvatarImage
              src={settings.profileImageUrl || undefined}
              alt=""
              className="object-cover"
            />
            <AvatarFallback className="rounded-inner bg-inverse text-text-inverse type-label-sm">
              {initials(workspaceName)}
            </AvatarFallback>
          </Avatar>
          {rail ? null : (
            <>
              <span className="min-w-0 truncate type-label text-text-1">
                {workspaceName}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-text-3 transition-transform duration-(--dur-fast) group-data-[state=open]/menu:rotate-180" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={rail ? "right" : "bottom"}
        align="start"
        className="w-64"
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 pb-2">
          <Avatar className="size-8">
            <AvatarImage
              src={settings.profileImageUrl || undefined}
              alt=""
              className="object-cover"
            />
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate type-label text-text-1">
              {name}
            </span>
            <span className="block truncate type-label-sm text-text-3">
              {handle}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isSignedIn ? (
          <>
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
        <MenuLink
          item={routes.settings}
          current={page === "settings"}
          shortcut="G S"
        />
        <MenuLink
          item={routes["profile-edit"]}
          current={page === "profile-edit"}
        />
        <MenuLink item={routes.profile} current={page === "profile"} />
        <MenuLink
          item={routes["organization-profile"]}
          current={page === "organization-profile"}
        />
        {isSignedIn ? (
          <MenuLink
            item={routes.subscription}
            current={page === "subscription"}
          />
        ) : null}
        {onThemeChange ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40">
              <DropdownMenuRadioGroup
                value={settings.theme}
                onValueChange={(value) => onThemeChange(value as ThemeChoice)}
              >
                <DropdownMenuRadioItem value="Light">
                  <Sun /> Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Dark">
                  <Moon /> Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="System">
                  <Monitor /> System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {isSignedIn ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </>
        ) : isAuthEnabled ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              Sign-in needs Clerk and Convex configuration.
            </DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuLink({
  item,
  current,
  shortcut,
}: {
  item: RouteItem;
  current: boolean;
  shortcut?: string;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link
        to={item.href}
        activeOptions={{ exact: true }}
        aria-current={current ? "page" : undefined}
      >
        {item.label}
        {shortcut ? (
          <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>
        ) : null}
      </Link>
    </DropdownMenuItem>
  );
}

/**
 * The viewport's top bar: where you are, the views of this list, and the
 * page's actions (PageHeader renders them into the right side).
 */
function TopBar({
  page,
  pathname,
  title,
  breadcrumb,
  onMenu,
  onActionsHost,
  onNewProject,
}: {
  page: ShellPage;
  pathname: string;
  title?: string;
  breadcrumb: string | null;
  onMenu: () => void;
  onActionsHost: (element: HTMLElement | null) => void;
  onNewProject?: () => void;
}) {
  const search = useSearch({ strict: false }) as { section?: string };
  const views = viewGroupFor(page);
  const showViews = Boolean(views?.some((item) => item.href === pathname));
  // A view group is named by its owner page, e.g. Projects for its calendar.
  const route = showViews
    ? routes[sidebarPageFor(page)]
    : allRoutes.find((item) => item.page === page);
  const pageLabel = title ?? route?.label ?? "Relay";
  const settingsSection =
    page === "settings"
      ? settingsSections.find(
          (section) => section.id === (search.section ?? "workspace")
        )?.label
      : undefined;
  const trail = breadcrumb ?? settingsSection ?? null;
  const parentHref = breadcrumb ? route?.href : undefined;

  return (
    <header className="flex h-(--topbar) shrink-0 items-center gap-2 px-2 shadow-[inset_0_-1px_0_var(--line-row)] lg:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label="Open menu"
        onClick={onMenu}
      >
        <Menu />
      </Button>
      <nav
        aria-label={`Current location: ${trail ? `${pageLabel} / ${trail}` : pageLabel}`}
        className="flex min-w-0 items-center gap-1 type-label"
      >
        {parentHref ? (
          <Link
            to={parentHref}
            className="max-w-28 shrink-0 truncate rounded-inner px-1 text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1 sm:max-w-none"
          >
            {pageLabel}
          </Link>
        ) : (
          <span
            className={cn(
              "shrink-0 px-1",
              trail ? "text-text-2" : "text-text-1"
            )}
          >
            {pageLabel}
          </span>
        )}
        {trail ? (
          <>
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 shrink-0 text-text-3"
            />
            <span className="min-w-0 truncate px-1 text-text-1">{trail}</span>
          </>
        ) : null}
      </nav>
      {showViews && views ? (
        <nav
          aria-label={`${pageLabel} views`}
          className="ms-1 flex h-(--control-sm) shrink-0 items-stretch gap-0.5 rounded-soft bg-well p-0.5"
        >
          {views.map((item) => {
            const current = item.href === pathname;
            return (
              <Link
                key={item.page}
                to={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-inner px-2.5 type-label-sm transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-step)",
                  current
                    ? "bg-page text-text-1 control-edge"
                    : "text-text-2 hover:text-text-1"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <div
        ref={onActionsHost}
        data-slot="topbar-actions"
        className="ms-auto flex min-w-0 shrink-0 items-center gap-2"
      />
      {onNewProject ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="New project"
          onClick={onNewProject}
        >
          <Compose />
        </Button>
      ) : null}
    </header>
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
  const { hasAccount } = useAiAccount();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const reduceMotion = useHydratedReducedMotion();
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
        showCloseButton={false}
        className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-(--overlay-lg)"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.16,
            ease: [0.2, 0, 0, 1],
          }}
        >
          <Command>
            <CommandInput
              aria-label="Search pages, records and actions"
              placeholder="Search or jump to..."
            />
            <CommandList className="max-h-[min(420px,60dvh)]">
              <CommandEmpty>
                Nothing matches. Try a project or page name.
              </CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => runCommand(onNewProject)}>
                  <Plus /> New project
                  <CommandShortcut>C</CommandShortcut>
                </CommandItem>
                {featuredAiTools.map(aiCommand)}
              </CommandGroup>
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
                          <CommandShortcut>{record.detail}</CommandShortcut>
                        </HrefLink>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ) : null}
              <CommandSeparator />
              {commandGroups.map((group) => (
                <CommandGroup key={group.id} heading={group.label}>
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
              <CommandGroup heading="AI tools">
                {otherAiTools.map(aiCommand)}
              </CommandGroup>
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
