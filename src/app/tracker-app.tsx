"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserProfile } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useData } from "@/lib/data-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Autocomplete
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import MovieCreationOutlinedIcon from "@mui/icons-material/MovieCreationOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SearchIcon from "@mui/icons-material/Search";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ViewTimelineOutlinedIcon from "@mui/icons-material/ViewTimelineOutlined";
import Link from "next/link";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { DEFAULT_PROFILE_ID, getProfile } from "@/lib/profiles";
import { useHydratedReducedMotion } from "@/lib/motion";
import type { WorkItem, WorkTypeConfig, IntegrationConfig, ResourceLink, SalaryBatch, SavedProjectTemplate } from "@/lib/types";
import {
  buildPayoutReport,
  payoutReportToCsv,
  type PayoutEditor,
  type PayoutPeriod,
} from "@/lib/payout-reporting";
import {
  APPROVAL_STATUS_LABELS,
  CLIENT_PORTAL_STAGE_VALUES,
  DELIVERABLE_STATUS_VALUES,
  FILE_CATEGORY_VALUES,
  FILE_PROVIDER_VALUES,
  FILE_STATUS_VALUES,
  PROJECT_STATUS_VALUES,
  REVISION_STATUS_VALUES,
  TEAM_ROLE_VALUES,
  type ClientPortalStage,
  type DeliverableStatus,
  type FileCategory,
  type FileProvider,
  type FileStatus,
  type ProjectStatus,
  type RevisionStatus,
  type SettingsTeamRole,
  type StoredTeamRole,
  approvalStatusLabel,
} from "@/lib/domain-values";
import type { IntegrationLink, IntegrationLinks, IntegrationServiceId } from "@/lib/integrations";
import {
  PROJECT_TEMPLATES,
  applyProjectTemplate,
  type ProjectTemplate,
} from "@/lib/project-templates";
import {
  normalizeOptionalTimecode,
  TIMECODE_FORMAT_HINT,
} from "@/lib/timecode";
import {
  configuredIntegrationCount,
  emptyIntegrationLink,
  hasIntegrationLink,
  integrationDisplayText,
  integrationServices,
  integrationStatusLabel,
  isIntegrationServiceId,
  isValidIntegrationUrl,
  normalizeIntegrationLink
} from "@/lib/integrations";
import { cutlab, cutlabOutlineButtonSx, cutlabPanelSx, cutlabThemeVariables } from "./design-system";
import { CutLabLockup, CutLabMark } from "./cutlab-brand";
import { emptyStateAssetFor, emptyStateAssets } from "./brand-assets";
import { MetricRail, SectionEyebrow, SectionModule, SplitWorkspace } from "./production-ui";
import { WorkflowDistributionChart, WorkMixChart } from "./production-charts";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PrecisionDashboard } from "@/components/precision-dashboard";
import { PrecisionProjects } from "@/components/precision-projects";
import { PrecisionCalendar, PrecisionTimeline } from "@/components/precision-schedule";
import { PrecisionClients, PrecisionFeedback, PrecisionReports } from "@/components/precision-workspaces";
import { PrecisionMedia } from "@/components/precision-media";
import { PrecisionSettings } from "@/components/precision-settings";
import { useAppAuth } from "@/lib/auth-context";

const defaultProjectTags = ["Job / Salary", "Freelance", "Personal Channel"];
const defaultSalaryWorkType = "Job / Salary";
const defaultSalaryBatchSize = 20;
const defaultSalaryBatchAmount = 10000;
const AUTH_MODE_STORAGE_KEY = "cutlab-studio:auth-mode:v1";
const TEAM_WORKSPACE_NAME_LIMIT = 80;
const TEAM_CHAT_MESSAGE_LIMIT = 800;
const TEAM_PROJECT_COMMENT_LIMIT = 1000;
const TEAM_INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const MIN_PUBLIC_SLUG_LENGTH = 2;
const sidebarWidth = 248;
const collapsedSidebarWidth = 76;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "cutlab-studio:sidebar-collapsed:v1";
const LOCAL_PROJECT_ACTIVITY_STORAGE_KEY = "cutlab-studio:project-activity:v1";
const headingFont = cutlab.font.heading;
const defaultAccent = cutlab.color.teal;
const accent = `var(--app-accent, ${cutlab.color.teal})`;
const ink = `var(--app-ink, ${cutlab.color.softWhite})`;
const muted = "var(--app-muted, #A5ADB4)";
const border = "var(--app-border, #2A3138)";
const panel = `var(--app-panel, ${cutlab.color.graphite})`;
const canvas = `var(--app-canvas, ${cutlab.color.charcoal})`;
const activeBg = "var(--app-active, rgba(45,140,151,0.18))";
const hoverBg = "var(--app-hover, rgba(105,196,206,0.09))";
const softPanel = "var(--app-soft-panel, #151B20)";
const headerPanel = "var(--app-header-panel, #20272D)";
const controlPanel = "var(--app-control, #11161A)";
const progressTrack = "var(--app-progress-track, #293139)";
const avatarSurface = `var(--app-avatar-surface, ${cutlab.color.slate})`;
const thumbIcon = "var(--app-thumb-icon, rgba(230,229,227,0.42))";
const successColor = `var(--app-success, ${cutlab.color.success})`;
const warningColor = `var(--app-warning, ${cutlab.color.warning})`;
const dangerColor = `var(--app-danger, ${cutlab.color.error})`;
const panelSx = cutlabPanelSx;
const tableHeadingSx = { color: muted, fontSize: 11, fontWeight: 760, textTransform: "uppercase" };
const outlineButtonSx = cutlabOutlineButtonSx;

type PageKey = "dashboard" | "projects" | "clients" | "timeline" | "calendar" | "media" | "resources" | "feedback" | "templates" | "reports" | "integrations" | "team" | "team-chat" | "settings" | "account" | "profile" | "profile-edit" | "organization-profile";
type NavigationItem = {
  key: PageKey;
  href: string;
  label: string;
  icon: React.ReactNode;
  pages: PageKey[];
};
type ProjectKind = string;
type DueFilter = "ALL" | "This Week" | "Overdue" | "Delivered";
type SortKey = "createdAt_desc" | "createdAt_asc" | "dueDate_asc" | "earnings_desc" | "earnings_asc";
type ClientDetailTab = "Overview" | "Projects" | "Files" | "Activity";
type TeamMember = {
  id: string;
  name: string;
  role: StoredTeamRole;
  email: string;
};
type WorkspaceMemberOption = {
  userId: string;
  name: string;
  email: string;
  role: string;
};
type SettingsState = {
  studioName: string;
  profileName: string;
  profileUsername: string;
  profileTitle: string;
  profileBio: string;
  profileLocation: string;
  profileImageUrl: string;
  publicActiveProjects: number;
  publicDeliveredEdits: number;
  publicTurnaroundDays: number;
  timeZone: string;
  dateFormat: string;
  weekStart: string;
  currencyCode: string;
  customClients: string[];
  customProjectTemplates: SavedProjectTemplate[];
  projectTags: string[];
  salaryWorkType: string;
  salaryBatchSize: number;
  salaryBatchAmount: number;
  projectStages: string[];
  notifications: Record<string, boolean>;
  integrations: Record<string, boolean>;
  integrationAccounts: Record<string, string>;
  integrationConfigs: Record<string, IntegrationConfig>;
  integrationLinks: IntegrationLinks;
  teamRole: SettingsTeamRole;
  teamMembers: TeamMember[];
  editorPermissions: Record<string, boolean>;
  rolePermissions: Record<string, Record<string, boolean>>;
  theme: string;
  accentColor: string;
  density: string;
};
type ToastState = {
  message: string;
  tone: "success" | "info" | "warning";
};
type DashboardActivity = {
  id: string;
  kind: "created" | "updated" | "status" | "delivered" | "team";
  message: string;
  projectId?: string;
  actor?: string;
  createdAt: string;
};
type ProjectActivityEvent = {
  id: string;
  projectId: string;
  actorName: string;
  kind: string;
  message: string;
  detail?: string;
  createdAt: string;
};
type DashboardPipelineStage = "Planning" | "In Progress" | "Review" | "Delivered";
type DashboardPipelineItem = {
  key: DashboardPipelineStage;
  count: number;
  percent: number;
};

const profile = getProfile(DEFAULT_PROFILE_ID);

const statusOptions: ProjectStatus[] = [...PROJECT_STATUS_VALUES];
const externalFileProviderOptions = FILE_PROVIDER_VALUES.filter(
  (provider): provider is Exclude<FileProvider, "convex"> => provider !== "convex"
);
const billingOptions = ["ALL", "Paid", "Unpaid"];
const dueOptions: DueFilter[] = ["ALL", "This Week", "Overdue", "Delivered"];
const sortOptions: SortKey[] = ["createdAt_desc", "createdAt_asc", "dueDate_asc", "earnings_desc", "earnings_asc"];
const teamRoleOptions = [...TEAM_ROLE_VALUES];
const currencyOptions = ["USD", "EUR", "GBP", "INR", "AED", "SAR"];
const currencyLabels: Record<string, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  INR: "INR (Rs)",
  AED: "AED (Dh)",
  SAR: "SAR (SR)"
};
const resourceCategories = ["Asset Folder", "Raw Footage", "Music / SFX", "Brand Assets", "Review Link", "Reference", "Other"];
const sortLabels: Record<SortKey, string> = {
  createdAt_desc: "Newest",
  createdAt_asc: "Oldest",
  dueDate_asc: "Due soon",
  earnings_desc: "High earn",
  earnings_asc: "Low earn"
};

const permissionKeys = [
  "Create and edit projects",
  "Upload media and assets",
  "Manage project stages",
  "Invite team members",
  "Manage app settings"
];

const defaultRolePermissions: Record<string, Record<string, boolean>> = {
  Owner: Object.fromEntries(permissionKeys.map((k) => [k, true])),
  Editor: Object.fromEntries(permissionKeys.map((k) => [k, ["Create and edit projects", "Upload media and assets"].includes(k)])),
  Reviewer: Object.fromEntries(permissionKeys.map((k) => [k, false])),
};

const emptyIntegrationConfig: IntegrationConfig = {
  connected: false,
  account: "",
  folder: "",
  channel: "",
  workspace: "",
  webhookUrl: "",
  connectedAt: "",
  lastSyncAt: ""
};

const integrationNames = ["Google Drive", "Dropbox", "Slack", "Frame.io"];

const defaultIntegrationConfigs: Record<string, IntegrationConfig> = Object.fromEntries(
  integrationNames.map((name) => [name, { ...emptyIntegrationConfig }])
);

const integrationDescriptions: Record<string, string> = {
  "Google Drive": "Save Google Drive folder and file links for project assets.",
  Dropbox: "Save Dropbox folder and delivery package links.",
  Slack: "Save Slack channel or message links for project discussion.",
  "Frame.io": "Save Frame.io review links and approval pages."
};

const integrationIcons: Record<string, string> = {
  "Google Drive": "G",
  Dropbox: "D",
  Slack: "S",
  "Frame.io": "F"
};

const integrationColors: Record<string, string> = {
  "Google Drive": "#4285f4",
  Dropbox: "#0061ff",
  Slack: "#4a154b",
  "Frame.io": "#8b5cf6"
};

const navigationItems: NavigationItem[] = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: <GridViewOutlinedIcon />, pages: ["dashboard"] },
  { key: "projects", href: "/projects", label: "Projects", icon: <FolderOpenOutlinedIcon />, pages: ["projects", "timeline", "calendar"] },
  { key: "clients", href: "/clients", label: "Clients", icon: <PeopleAltOutlinedIcon />, pages: ["clients", "feedback"] },
  { key: "media", href: "/media", label: "Library", icon: <CollectionsOutlinedIcon />, pages: ["media", "resources", "templates", "integrations"] },
  { key: "reports", href: "/reports", label: "Reports", icon: <InsertChartOutlinedIcon />, pages: ["reports"] },
  { key: "team", href: "/team", label: "Team", icon: <PeopleAltOutlinedIcon />, pages: ["team", "team-chat"] },
  { key: "settings", href: "/settings", label: "Settings", icon: <SettingsOutlinedIcon />, pages: ["settings", "account"] }
];

const defaultSettings: SettingsState = {
  studioName: "",
  profileName: "",
  profileUsername: "",
  profileTitle: "",
  profileBio: "",
  profileLocation: "",
  profileImageUrl: "",
  publicActiveProjects: 0,
  publicDeliveredEdits: 0,
  publicTurnaroundDays: 3,
  timeZone: "UTC",
  dateFormat: "Month Day, Year",
  weekStart: "Mon",
  currencyCode: "USD",
  customClients: [],
  customProjectTemplates: [],
  projectTags: [...defaultProjectTags],
  salaryWorkType: defaultSalaryWorkType,
  salaryBatchSize: defaultSalaryBatchSize,
  salaryBatchAmount: defaultSalaryBatchAmount,
  projectStages: ["Planned", "In Progress", "Client Review", "Delivered"],
  notifications: {
    "Project updates": false,
    "Feedback received": false,
    "Upcoming deadlines": false,
    Mentions: false,
    "Weekly summary": false
  },
  integrations: {
    "Google Drive": false,
    Dropbox: false,
    Slack: false,
    "Frame.io": false
  },
  integrationAccounts: {
    "Google Drive": "",
    Dropbox: "",
    Slack: "",
    "Frame.io": ""
  },
  integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)),
  integrationLinks: {},
  teamRole: "",
  teamMembers: [],
  editorPermissions: {
    "Create and edit projects": false,
    "Upload media and assets": false,
    "Manage project stages": false,
    "Invite team members": false,
    "Manage app settings": false
  },
  rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
  theme: "Light",
  accentColor: defaultAccent,
  density: "Comfortable"
};

const SettingsContext = createContext<SettingsState>(defaultSettings);
const PageContext = createContext<PageKey>("dashboard");

function useTrackerSettings() {
  return useContext(SettingsContext);
}

const emptyForm = (): WorkItem => ({
  id: "",
  profileId: profile.id,
  title: "",
  client: "",
  status: "Planned",
  workType: "Freelance",
  startDate: iso(todayDate()),
  dueDate: iso(todayDate()),
  earnings: 0,
  notes: "",
  integrationLinks: {}
});

export function TrackerApp({ page }: { page: PageKey }) {
  const {
    items,
    setItems,
    settings,
    setSettings,
    resourceLinks,
    setResourceLinks,
    salaryBatches,
    isSignedIn,
    isAuthLoaded,
    toast,
    setToast,
    reconcileSalaryBatches,
    updateSalaryBatchPayment,
  } = useData();
  const { openSignIn, openSignUp } = useAppAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const shouldLoadTeamPermissions = Boolean(isSignedIn && isConvexAuthenticated);
  const teamData = useQuery(api.team.getMyWorkspace, shouldLoadTeamPermissions ? {} : "skip");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectStartOpen, setProjectStartOpen] = useState(false);
  const [projectStartScope, setProjectStartScope] = useState<"personal" | "team">("personal");
  const [editingId, setEditingId] = useState("");
  const [detailProjectId, setDetailProjectId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [form, setForm] = useState<WorkItem>(emptyForm);
  const [formError, setFormError] = useState("");
  const [authChoiceOpen, setAuthChoiceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [kindFilter, setKindFilter] = useState<ProjectKind>("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState<DueFilter>("ALL");
  const [billingFilter, setBillingFilter] = useState<"ALL" | "Paid" | "Unpaid">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt_desc");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardActivity, setDashboardActivity] = useState<DashboardActivity[]>([]);
  const [localProjectActivity, setLocalProjectActivity] = useState<ProjectActivityEvent[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const value = JSON.parse(window.localStorage.getItem(LOCAL_PROJECT_ACTIVITY_STORAGE_KEY) ?? "[]");
      return Array.isArray(value) ? value.slice(0, 500) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    applyRootThemeVariables(settings);
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_PROJECT_ACTIVITY_STORAGE_KEY, JSON.stringify(localProjectActivity.slice(0, 500)));
  }, [localProjectActivity]);

  useEffect(() => {
    if (typeof window === "undefined" || !isAuthLoaded) return;
    if (isSignedIn) {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "account");
      setAuthChoiceOpen(false);
      return;
    }

    const savedMode = window.localStorage.getItem(AUTH_MODE_STORAGE_KEY);
    setAuthChoiceOpen(!savedMode);
  }, [isAuthLoaded, isSignedIn]);

  const projects = useMemo(() => items.filter((item) => (item.profileId || DEFAULT_PROFILE_ID) === profile.id), [items]);
  const personalProjects = useMemo(() => projects.filter((item) => !item.teamId), [projects]);

  useEffect(() => {
    reconcileSalaryBatches(projects);
  }, [projects, reconcileSalaryBatches]);

  const activeTeamMembers = useMemo(() => teamData?.members.filter((member) => member.status === "active") ?? [], [teamData]);
  const teamDataLoading = Boolean(isSignedIn && (isConvexAuthLoading || (isConvexAuthenticated && teamData === undefined)));
  const teamSyncUnavailable = Boolean(isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated);
  const currentTeamId = teamData?.workspace?._id;
  const teamProjects = useMemo(
    () => (currentTeamId ? projects.filter((project) => project.teamId === currentTeamId) : []),
    [currentTeamId, projects]
  );
  const teamStats = useMemo(() => {
    const deliveredProjects = teamProjects.filter((project) => isDoneStatus(project.status));
    return {
      active: teamProjects.length - deliveredProjects.length,
      delivered: deliveredProjects.length,
      earned: deliveredProjects.reduce((total, project) => total + safeMoneyValue(project.earnings), 0),
      salaryEdits: deliveredProjects.filter((project) => isSalaryWorkType(project.workType, settings)).length
    };
  }, [settings, teamProjects]);
  const projectPermissions = teamData?.currentMember.permissions;
  const canCreateTeamProjects = teamSyncUnavailable || teamDataLoading ? false : Boolean(teamData && projectPermissions?.createProjects);
  const canCreateProjects = true;
  const canEditProjects = teamSyncUnavailable || teamDataLoading ? false : !teamData || Boolean(projectPermissions?.editProjects);
  const canUpdateProjectStatus = teamSyncUnavailable || teamDataLoading ? false : !teamData || Boolean(projectPermissions?.updateStatus);
  const canCommentProjects = teamSyncUnavailable || teamDataLoading ? false : !teamData || Boolean(projectPermissions?.commentProjects);
  const canManageTeamProjects = Boolean(projectPermissions?.manageTeam);
  const detailProject = useMemo(() => items.find((item) => item.id === detailProjectId) ?? null, [detailProjectId, items]);
  const projectTagOptions = useMemo(() => projectWorkTypeOptions(settings, projects), [projects, settings]);
  const filterProjectTagOptions = useMemo(() => ["ALL", ...projectTagOptions], [projectTagOptions]);
  const clientOptions = useMemo(() => buildClientOptions(projects, settings.customClients), [projects, settings.customClients]);
  const clientFilterOptions = useMemo(() => ["ALL", ...clientOptions], [clientOptions]);
  const isClientBillableProject = useCallback((item: WorkItem) => (
    !isSalaryWorkType(item.workType, settings) &&
    isDoneStatus(item.status) &&
    safeMoneyValue(item.earnings) > 0
  ), [settings]);
  const isProjectPaid = useCallback((item: WorkItem) => isClientBillableProject(item) && Boolean(item.paid), [isClientBillableProject]);
  const isProjectUnpaid = useCallback((item: WorkItem) => isClientBillableProject(item) && !item.paid, [isClientBillableProject]);
  const filteredProjects = useMemo(() => {
    const searched = projects.filter((item) => {
      const haystack = `${item.title} ${item.client || ""} ${item.notes} ${item.workType}`.toLowerCase();
      const matchesSearch = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesKind = kindFilter === "ALL" || item.workType.trim().toLowerCase() === kindFilter.toLowerCase();
      const matchesClient = clientFilter === "ALL" || item.client?.trim().toLowerCase() === clientFilter.toLowerCase();
      const matchesDue = dueFilter === "ALL" || dueBucket(item) === dueFilter;
      const isPaid = isProjectPaid(item);
      const isUnpaid = isProjectUnpaid(item);
      const matchesBilling =
        billingFilter === "ALL" ||
        (billingFilter === "Paid" && isPaid) ||
        (billingFilter === "Unpaid" && isUnpaid);
      return matchesSearch && matchesStatus && matchesKind && matchesClient && matchesDue && matchesBilling;
    });

    return [...searched].sort((a, b) => {
      if (sortKey === "createdAt_asc") return createdTime(a) - createdTime(b);
      if (sortKey === "dueDate_asc") return dateTime(a.dueDate || "9999-12-31") - dateTime(b.dueDate || "9999-12-31");
      if (sortKey === "earnings_desc") return safeMoneyValue(b.earnings) - safeMoneyValue(a.earnings);
      if (sortKey === "earnings_asc") return safeMoneyValue(a.earnings) - safeMoneyValue(b.earnings);
      return createdTime(b) - createdTime(a);
    });
  }, [billingFilter, clientFilter, dueFilter, isProjectPaid, isProjectUnpaid, kindFilter, projects, query, sortKey, statusFilter]);

  const stats = useMemo(() => {
    const earned = personalProjects.filter((item) => isProjectPaid(item)).reduce((total, item) => total + safeMoneyValue(item.earnings), 0);
    const unpaid = personalProjects.filter((item) => isProjectUnpaid(item)).length;
    const active = personalProjects.filter((item) => !isDoneStatus(item.status)).length;
    const salaryBatchSize = normalizedSalaryBatchSize(settings.salaryBatchSize);
    const salaryEdits = personalProjects.filter((item) => isSalaryWorkType(item.workType, settings) && isDoneStatus(item.status)).length;
    const salaryBatches = Math.floor(salaryEdits / salaryBatchSize);
    const delivered = personalProjects.filter((item) => isDoneStatus(item.status));
    const avgTurnaroundDays = delivered.length
      ? Math.round(delivered.reduce((total, item) => total + daysBetween(item.startDate, item.dueDate), 0) / delivered.length)
      : 0;
    return {
      total: personalProjects.length,
      active,
      unpaid,
      earned: earned + salaryBatches * normalizedSalaryBatchAmount(settings.salaryBatchAmount),
      salaryEdits,
      salaryBatchProgress: salaryEdits % salaryBatchSize,
      delivered: delivered.length,
      avgTurnaroundDays
    };
  }, [isProjectPaid, isProjectUnpaid, personalProjects, settings.salaryBatchAmount, settings.salaryBatchSize, settings.salaryWorkType]);

  function openNewProject(scope: "personal" | "team" = "personal") {
    if (scope === "team" && !canCreateTeamProjects) {
      notify("Your team role cannot create projects.", "warning");
      return;
    }
    if (scope === "team" && !currentTeamId) {
      notify("Create or join a team workspace before adding team projects.", "warning");
      return;
    }
    setProjectStartScope(scope);
    setProjectStartOpen(true);
  }

  function openBlankProject(scope: "personal" | "team" = projectStartScope) {
    setEditingId("");
    setForm({
      ...emptyForm(),
      teamId: scope === "team" ? currentTeamId : undefined,
      assigneeUserIds: [],
      notes: defaultProjectNotes(settings)
    });
    setFormError("");
    setProjectStartOpen(false);
    setDialogOpen(true);
  }

  function notify(message: string, tone: ToastState["tone"] = "success") {
    setToast({ message, tone });
  }

  function logLocalProjectActivity(event: Omit<ProjectActivityEvent, "id" | "actorName" | "createdAt"> & { actorName?: string; createdAt?: string }) {
    setLocalProjectActivity((current) => [{
      ...event,
      id: createId(),
      actorName: event.actorName ?? (settings.profileName || "Local user"),
      createdAt: event.createdAt ?? new Date().toISOString()
    }, ...current].slice(0, 500));
  }

  function chooseLocalMode() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "local");
    }
    setAuthChoiceOpen(false);
    notify("Using local mode on this device.", "info");
  }

  function launchAccountFlow(mode: "sign-up" | "sign-in") {
    setAuthChoiceOpen(false);
    if (mode === "sign-up") {
      openSignUp();
      return;
    }
    openSignIn();
  }

  function openTemplateProject(template: ProjectTemplate, scope: "personal" | "team" = projectStartScope) {
    if (!canCreateProjects) {
      notify("Your team role cannot create projects.", "warning");
      return;
    }
    if (scope === "team" && (!canCreateTeamProjects || !currentTeamId)) {
      notify("Your team role cannot create projects in this workspace.", "warning");
      return;
    }
    const freelanceTag = settings.projectTags.find((tag) => tag.toLowerCase().includes("freelance"))
      ?? settings.projectTags.find((tag) => !isSalaryWorkType(tag, settings))
      ?? settings.projectTags[0]
      ?? "Freelance";
    const channelTag = settings.projectTags.find((tag) => tag.toLowerCase().includes("channel"))
      ?? freelanceTag;
    setEditingId("");
    setForm({
      id: "",
      ...applyProjectTemplate(template, {
        profileId: profile.id,
        startDate: iso(todayDate()),
        dueDate: iso(addDays(todayDate(), template.durationDays)),
        workType: template.workType === "channel" ? channelTag : freelanceTag,
        baseNotes: defaultProjectNotes(settings),
        teamId: scope === "team" ? currentTeamId : undefined,
      }),
    });
    setFormError("");
    setProjectStartOpen(false);
    setDialogOpen(true);
  }

  function openEditProject(item: WorkItem) {
    if (item.teamId && !canEditProjects) {
      notify("Your team role cannot edit team projects.", "warning");
      return;
    }
    setEditingId(item.id);
    setDetailProjectId("");
    setForm(item);
    setFormError("");
    setDialogOpen(true);
  }

  function openProjectDetails(item: WorkItem) {
    setDetailProjectId(item.id);
  }

  function canDeleteProject(project: WorkItem | null) {
    if (!project) return false;
    if (!project.teamId) return true;
    return (canEditProjects || canManageTeamProjects) && (project.ownerUserId === teamData?.currentMember.userId || canManageTeamProjects);
  }

  function requestDeleteProject(id: string) {
    const target = items.find((item) => item.id === id);
    if (target && !canDeleteProject(target)) {
      notify("Only the project owner or a team owner can delete this team project.", "warning");
      return;
    }
    if (target) setDeleteTarget(target);
  }

  function updateProjectStatus(project: WorkItem, status: ProjectStatus) {
    if (project.teamId && !canUpdateProjectStatus && !canEditProjects) {
      notify("Your team role cannot update project status.", "warning");
      return;
    }
    setItems((current) => current.map((item) => (item.id === project.id ? { ...item, status } : item)));
    setDashboardActivity((current) => {
      const activity: DashboardActivity = {
        id: createId(),
        kind: isDoneStatus(status) ? "delivered" : "status",
        message: isDoneStatus(status) ? `${project.title} was delivered` : `${project.title} moved to ${status}`,
        projectId: project.id,
        createdAt: new Date().toISOString()
      };
      return [activity, ...current].slice(0, 20);
    });
    logLocalProjectActivity({
      projectId: project.id,
      kind: "status_changed",
      message: `${project.title} status changed from ${project.status} to ${status}.`
    });
    notify(`${project.title} status updated.`);
  }

  function updateProjectChecklist(project: WorkItem, itemKey: string, completed: boolean) {
    if (project.teamId && !canEditProjects) {
      notify("Your team role cannot edit team project checklists.", "warning");
      return;
    }
    const currentCompleted = normalizeChecklistCompleted(project.checklistItems, project.checklistCompleted);
    const nextCompleted = { ...currentCompleted };
    if (completed) nextCompleted[itemKey] = true;
    else delete nextCompleted[itemKey];
    setItems((current) => current.map((item) => item.id === project.id ? { ...item, checklistCompleted: nextCompleted } : item));
    logLocalProjectActivity({
      projectId: project.id,
      kind: "project_updated",
      message: `${project.title} checklist progress was updated.`,
    });
  }

  function updateProjectPayment(project: WorkItem, paid: boolean) {
    if (project.teamId && !canEditProjects) {
      notify("Your team role cannot edit team project payment status.", "warning");
      return;
    }
    if (!isClientBillableProject(project)) {
      notify("Only delivered billable client projects can be marked paid.", "warning");
      return;
    }
    const paidDate = paid ? new Date().toISOString() : "";
    setItems((current) => current.map((item) => item.id === project.id ? { ...item, paid, paidDate } : item));
    logLocalProjectActivity({
      projectId: project.id,
      kind: "project_updated",
      message: `${project.title} was marked ${paid ? "paid" : "unpaid"}.`,
    });
    notify(`${project.title} marked ${paid ? "paid" : "unpaid"}.`);
  }

  function confirmDeleteProject() {
    if (!deleteTarget) return;
    setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
    setLocalProjectActivity((current) => current.filter((event) => event.projectId !== deleteTarget.id));
    if (detailProjectId === deleteTarget.id) setDetailProjectId("");
    setDeleteTarget(null);
    notify("Project deleted.", "warning");
  }

  function saveProject() {
    const canonicalClient = canonicalClientName(form.client || "", clientOptions);
    const normalizedWorkType = canonicalWorkType(form.workType, projectTagOptions);
    const normalizedForm = { ...form, client: canonicalClient, workType: normalizedWorkType, integrationLinks: normalizeProjectIntegrationLinks(form.integrationLinks) };
    const typeConfig = getTypeConfig(normalizedForm.workType, settings);
    const error = validateProject(normalizedForm, typeConfig, projectTagOptions);
    if (error) {
      setFormError(error);
      return;
    }
    const payload: WorkItem = {
      ...normalizedForm,
      title: normalizedForm.title.trim(),
      id: editingId || createId(),
      teamId: normalizedForm.teamId,
      ownerUserId: normalizedForm.ownerUserId ?? (!editingId && normalizedForm.teamId ? teamData?.currentMember.userId : undefined),
      assigneeUserIds: normalizedForm.assigneeUserIds ?? [],
      createdAt: form.createdAt || new Date().toISOString(),
      profileId: profile.id,
      client: normalizedForm.client?.trim() || "",
      notes: normalizedForm.notes.trim(),
      earnings: typeConfig.earningsMode === "batch" ? 0 : safeMoneyValue(normalizedForm.earnings),
      paid: typeConfig.earningsMode === "batch" ? false : Boolean(normalizedForm.paid),
      paidDate: typeConfig.earningsMode === "batch" || !normalizedForm.paid ? "" : normalizedForm.paidDate || new Date().toISOString(),
      checklistCompleted: normalizeChecklistCompleted(normalizedForm.checklistItems, normalizedForm.checklistCompleted),
      integrationLinks: normalizedForm.integrationLinks
    };
    setItems((current) => (editingId ? current.map((item) => (item.id === editingId ? payload : item)) : [payload, ...current]));
    setDashboardActivity((current) => {
      const activity: DashboardActivity = {
        id: createId(),
        kind: editingId ? "updated" : "created",
        message: editingId ? `${payload.title} was updated` : `${payload.title} was created`,
        projectId: payload.id,
        createdAt: new Date().toISOString()
      };
      return [activity, ...current].slice(0, 20);
    });
    logLocalProjectActivity({
      projectId: payload.id,
      kind: editingId ? "project_updated" : "project_created",
      message: editingId ? `${payload.title} was updated.` : `${payload.title} was created.`,
      createdAt: editingId ? undefined : payload.createdAt
    });
    setDialogOpen(false);
    setEditingId("");
    setForm(emptyForm());
    notify(editingId ? "Project updated." : "Project created.");
  }

  function handleAddClient(clientName: string) {
    const canonical = canonicalClientName(clientName, clientOptions, false);
    if (!canonical) return;
    setSettings((current) => {
      const existing = findExistingClientName(canonical, [...current.customClients, ...buildClientOptions(projects)]);
      if (existing) return current;
      return { ...current, customClients: [...current.customClients, canonical] };
    });
    notify(`Client "${canonical}" added.`);
  }

  const pageContent = page === "dashboard" ? (
    <PrecisionDashboard
      settings={settings}
      stats={stats}
      projects={personalProjects}
      visibleProjects={filteredProjects.filter((project) => !project.teamId)}
      sessionActivity={dashboardActivity}
      teamActivity={teamData?.activity ?? []}
      teamName={teamData?.workspace?.name}
      teamLoading={teamDataLoading}
      query={query}
      setQuery={setQuery}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      kindFilter={kindFilter}
      setKindFilter={setKindFilter}
      clientFilter={clientFilter}
      setClientFilter={setClientFilter}
      clientOptions={clientOptions}
      projectTagOptions={filterProjectTagOptions}
      dueFilter={dueFilter}
      setDueFilter={setDueFilter}
      billingFilter={billingFilter}
      setBillingFilter={setBillingFilter}
      sortKey={sortKey}
      setSortKey={setSortKey}
      onNewProject={() => openNewProject("personal")}
      onViewProject={openProjectDetails}
      onEditProject={openEditProject}
      onDeleteProject={requestDeleteProject}
      canCreateProjects={canCreateProjects}
      canEditProjects={canEditProjects}
      canDeleteProject={canDeleteProject}
    />
  ) : page === "projects" ? (
    <PrecisionProjects
      settings={settings}
      personalProjects={personalProjects}
      teamProjects={teamProjects}
      teamName={teamData?.workspace?.name}
      onNewProject={openNewProject}
      onViewProject={openProjectDetails}
      onEditProject={openEditProject}
      onDeleteProject={requestDeleteProject}
      canCreateProjects={canCreateProjects}
      canCreateTeamProjects={canCreateTeamProjects}
      canEditProjects={canEditProjects}
      canDeleteProject={canDeleteProject}
    />
  ) : page === "clients" ? (
    <PrecisionClients projects={personalProjects} settings={settings} onAddClient={handleAddClient} onViewProject={openProjectDetails} />
  ) : page === "timeline" ? (
    <PrecisionTimeline projects={personalProjects} onViewProject={openProjectDetails} />
  ) : page === "calendar" ? (
    <PrecisionCalendar projects={personalProjects} settings={settings} onViewProject={openProjectDetails} />
  ) : page === "media" ? (
    <PrecisionMedia projects={personalProjects} onViewProject={openProjectDetails} />
  ) : page === "resources" ? (
    <ResourcesDesignPage resources={resourceLinks} projects={personalProjects} setResources={setResourceLinks} notify={notify} />
  ) : page === "feedback" ? (
    <PrecisionFeedback projects={personalProjects} onViewProject={openProjectDetails} />
  ) : page === "templates" ? (
    <TemplatesDesignPage
      onUseBlank={() => openBlankProject("personal")}
      onUseTemplate={(template) => openTemplateProject(template, "personal")}
    />
  ) : page === "reports" ? (
    <PrecisionReports
      projects={projects}
      salaryBatches={salaryBatches}
      settings={settings}
      editors={activeTeamMembers.map((member) => ({ userId: member.userId, name: member.name }))}
      onUpdateBatchPayment={updateSalaryBatchPayment}
    />
  ) : page === "integrations" ? (
    <IntegrationsDesignPage projects={personalProjects} settings={settings} setSettings={setSettings} notify={notify} onEditProject={openEditProject} />
  ) : page === "team" ? (
    <TeamDesignPage projects={projects} settings={settings} setSettings={setSettings} />
  ) : page === "team-chat" ? (
    <TeamChatPage />
  ) : page === "settings" ? (
    <PrecisionSettings
      settings={settings}
      setSettings={setSettings}
      notify={notify}
      onReset={() => {
        setSettings({
          ...defaultSettings,
          customClients: [...defaultSettings.customClients],
          customProjectTemplates: defaultSettings.customProjectTemplates.map((template) => ({
            ...template,
            workflowStages: [...template.workflowStages],
            deliverables: template.deliverables.map((item) => ({ ...item })),
            checklistItems: [...template.checklistItems],
          })),
          projectTags: [...defaultSettings.projectTags],
          projectStages: [...defaultSettings.projectStages],
          notifications: { ...defaultSettings.notifications },
          integrations: { ...defaultSettings.integrations },
          integrationAccounts: { ...defaultSettings.integrationAccounts },
          integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)),
          integrationLinks: {},
          teamMembers: defaultSettings.teamMembers.map((member) => ({ ...member })),
          editorPermissions: { ...defaultSettings.editorPermissions },
          rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
        });
        notify("Settings reset to defaults.", "warning");
      }}
    />
  ) : page === "account" ? (
    <AccountSettingsPage />
  ) : page === "profile" ? (
    <ProfileDesignPage projects={personalProjects} stats={stats} settings={settings} />
  ) : page === "profile-edit" ? (
    <ProfileEditPage settings={settings} setSettings={setSettings} />
  ) : (
    <OrganizationProfilePage projects={teamProjects} settings={settings} stats={teamStats} />
  );
  const resolvedPageContent = isAuthLoaded ? pageContent : <WorkspaceLoadingPage />;

  const projectDialog = (
    <>
      <ProjectStartDialog
        open={projectStartOpen}
        scope={projectStartScope}
        onClose={() => setProjectStartOpen(false)}
        onBlank={() => openBlankProject(projectStartScope)}
        onTemplate={(template) => openTemplateProject(template, projectStartScope)}
      />
      <ProjectDialog
        open={dialogOpen}
        editing={Boolean(editingId)}
        form={form}
        setForm={(next) => {
          setForm(next);
          if (formError) setFormError("");
        }}
        clientOptions={clientOptions}
        workTypeOptions={projectTagOptions}
        settings={settings}
        teamMembers={activeTeamMembers}
        formError={formError}
        onClose={() => setDialogOpen(false)}
        onSave={saveProject}
      />
    </>
  );
  const deleteDialog = (
    <DeleteProjectDialog
      project={deleteTarget}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDeleteProject}
    />
  );
  const detailDialog = (
    <ProjectDetailDialog
      project={detailProject}
      settings={settings}
      canEdit={canEditProjects || !detailProject?.teamId}
      canDelete={canDeleteProject(detailProject)}
      canUpdateStatus={canUpdateProjectStatus || canEditProjects || !detailProject?.teamId}
      canComment={canCommentProjects}
      teamMembers={activeTeamMembers}
      localActivity={localProjectActivity.filter((event) => event.projectId === detailProject?.id)}
      onClose={() => setDetailProjectId("")}
      onEdit={(project) => openEditProject(project)}
      onDelete={(project) => {
        setDetailProjectId("");
        requestDeleteProject(project.id);
      }}
      onStatusChange={updateProjectStatus}
      onChecklistChange={updateProjectChecklist}
      onPaymentChange={updateProjectPayment}
      />
  );
  const loadingStatus = !isAuthLoaded ? <AppLoadingStatus /> : null;

  if (page === "profile") {
    return (
      <Box className="motion-enter" sx={{ ...appSurfaceSx(settings), minHeight: "100dvh", bgcolor: canvas, color: ink }}>
      <PageContext.Provider value={page}>
        <SettingsContext.Provider value={settings}>{resolvedPageContent}</SettingsContext.Provider>
      </PageContext.Provider>
      {projectDialog}
      {deleteDialog}
      {detailDialog}
      {loadingStatus}
      <WelcomeChoiceDialog
        open={authChoiceOpen}
        onChooseLocal={chooseLocalMode}
        onCreateAccount={() => launchAccountFlow("sign-up")}
        onSignIn={() => launchAccountFlow("sign-in")}
      />
    </Box>
  );
}

  return (
    <>
      <WorkspaceShell
        page={page}
        settings={settings}
        collapsed={sidebarCollapsed}
        onToggle={() => {
          const next = !sidebarCollapsed;
          setSidebarCollapsed(next);
          window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
        }}
        onNewProject={() => openNewProject("personal")}
        canCreateProject={canCreateProjects}
        notificationSlot={<NotificationBell settings={settings} />}
      >
        <Box sx={{ ...appSurfaceSx(settings), minHeight: "calc(100dvh - 56px)", bgcolor: canvas, color: ink }}>
          <PageContext.Provider value={page}>
            <SettingsContext.Provider value={settings}>{resolvedPageContent}</SettingsContext.Provider>
          </PageContext.Provider>
        </Box>
      </WorkspaceShell>
      <AppToast toast={toast} onClose={() => setToast(null)} />
      {projectDialog}
      {deleteDialog}
      {detailDialog}
      {loadingStatus}
      <WelcomeChoiceDialog
        open={authChoiceOpen}
        onChooseLocal={chooseLocalMode}
        onCreateAccount={() => launchAccountFlow("sign-up")}
        onSignIn={() => launchAccountFlow("sign-in")}
      />
    </>
  );
}

function Sidebar({
  page,
  settings,
  collapsed,
  onToggle
}: {
  page: PageKey;
  settings: SettingsState;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(profileMenuAnchor);
  const { isAuthEnabled } = useData();
  const width = collapsed ? collapsedSidebarWidth : sidebarWidth;

  return (
    <Box
      component="aside"
      sx={{
        display: { xs: "none", lg: "block" },
        position: "fixed",
        zIndex: 15,
        inset: "0 auto 0 0",
        width,
        bgcolor: "var(--app-sidebar, #0C1112)",
        borderRight: `1px solid ${border}`,
        px: collapsed ? 1.25 : 2.25,
        py: 2,
        transition: "width 180ms ease, padding 180ms ease"
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent={collapsed ? "center" : "space-between"} gap={1.5}>
        <Tooltip title={collapsed ? "Dashboard" : ""} placement="right">
          {collapsed
            ? <Box component={Link} href="/" aria-label="Go to dashboard" sx={{ display: "block" }}><CutLabMark size={18} /></Box>
            : <CutLabLockup compact subtitle="Production workspace" sx={{ minWidth: 0, flex: 1 }} />}
        </Tooltip>
        {!collapsed ? (
          <Tooltip title="Collapse sidebar">
            <Button aria-label="Collapse sidebar" onClick={onToggle} sx={{ minWidth: 32, width: 32, height: 32, p: 0, color: muted }}>
              <ChevronLeftIcon sx={{ fontSize: 19 }} />
            </Button>
          </Tooltip>
        ) : null}
      </Stack>
      {!collapsed ? (
        <Box sx={{ mt: 2.25, mb: 2.75, px: 1.25, py: 1.1, borderLeft: `2px solid ${accent}`, bgcolor: activeBg }}>
          <Typography sx={{ color: ink, fontSize: 12, fontWeight: 760 }}>{settings.studioName || "Personal workspace"}</Typography>
          <Typography sx={{ color: muted, fontSize: 10.5, mt: 0.2 }}>Editing operations</Typography>
        </Box>
      ) : (
        <Tooltip title="Expand sidebar" placement="right">
          <Button aria-label="Expand sidebar" onClick={onToggle} sx={{ minWidth: 40, width: 40, height: 34, p: 0, color: muted, mx: "auto", my: 1.5, display: "flex" }}>
            <ChevronRightIcon sx={{ fontSize: 19 }} />
          </Button>
        </Tooltip>
      )}
      <Box
        sx={{
          maxHeight: collapsed ? "calc(100dvh - 170px)" : "calc(100dvh - 190px)",
          overflowY: "auto",
          pb: 10,
          scrollbarWidth: "thin"
        }}
      >
        {!collapsed ? <Typography sx={{ px: 1.25, mb: 0.75, color: muted, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Production</Typography> : null}
        <Stack gap="3px">
          {navigationItems.slice(0, 5).map((item) => (
            <NavButton key={item.key} active={item.pages.includes(page)} href={item.href} icon={item.icon} collapsed={collapsed}>{item.label}</NavButton>
          ))}
        </Stack>
        <Box sx={{ borderTop: `1px solid ${border}`, mt: 2, pt: 1.5 }}>
          {!collapsed ? <Typography sx={{ px: 1.25, mb: 0.75, color: muted, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Workspace</Typography> : null}
          <Stack gap="3px">
            {navigationItems.slice(5).map((item) => (
              <NavButton key={item.key} active={item.pages.includes(page)} href={item.href} icon={item.icon} collapsed={collapsed}>{item.label}</NavButton>
            ))}
          </Stack>
        </Box>
      </Box>
      <Box sx={{ position: "absolute", left: collapsed ? 10 : 18, right: collapsed ? 10 : 18, bottom: 18, pt: 1.5, borderTop: `1px solid ${border}` }}>
        {!collapsed ? <Stack direction="row" gap={1.2} sx={{ mb: 1.2 }}>
          <Link href="/privacy" style={{ color: "var(--app-muted, #6f6a78)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Privacy</Link>
          <Typography component="span" sx={{ color: muted, fontSize: 12 }}>·</Typography>
          <Link href="/terms" style={{ color: "var(--app-muted, #6f6a78)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Terms</Link>
        </Stack> : null}
        <Button
          fullWidth={!collapsed}
          aria-label="Open profile menu"
          aria-haspopup="menu"
          aria-expanded={profileMenuOpen ? "true" : undefined}
          onClick={(event) => setProfileMenuAnchor(event.currentTarget)}
          sx={{
            justifyContent: collapsed ? "center" : "space-between",
            p: 0.75,
            minWidth: collapsed ? 44 : undefined,
            width: collapsed ? 44 : "100%",
            borderRadius: "6px",
            color: ink,
            textAlign: "left",
            "&:hover": { bgcolor: hoverBg }
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.1} sx={{ minWidth: 0 }}>
            <ProfileAvatar settings={settings} size={34} fontSize={12} />
            {!collapsed ? <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{profileDisplayName(settings)}</Typography>
              <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.2 }}>{displayUsername(settings) || settings.teamRole}</Typography>
            </Box> : null}
          </Stack>
          {!collapsed ? <ExpandMoreIcon sx={{ color: muted, fontSize: 18, flexShrink: 0 }} /> : null}
        </Button>
        <Menu
          anchorEl={profileMenuAnchor}
          open={profileMenuOpen}
          onClose={() => setProfileMenuAnchor(null)}
          PaperProps={{ sx: { minWidth: 238, bgcolor: panel, color: ink, border: `1px solid ${border}`, boxShadow: "none" } }}
        >
          <MenuItem component={Link} href="/profile" selected={page === "profile"} onClick={() => setProfileMenuAnchor(null)} sx={{ gap: 1.2, color: ink }}>
            <PersonOutlineOutlinedIcon sx={{ color: accent, fontSize: 19 }} />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 760 }}>Public profile</Typography>
              <Typography sx={{ color: muted, fontSize: 12 }}>What clients can review</Typography>
            </Box>
          </MenuItem>
          <MenuItem component={Link} href="/organization" selected={page === "organization-profile"} onClick={() => setProfileMenuAnchor(null)} sx={{ gap: 1.2, color: ink }}>
            <PeopleAltOutlinedIcon sx={{ color: accent, fontSize: 19 }} />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 760 }}>Organization profile</Typography>
              <Typography sx={{ color: muted, fontSize: 12 }}>{settings.studioName}</Typography>
            </Box>
          </MenuItem>
          <MenuItem component={Link} href="/profile/edit" selected={page === "profile-edit"} onClick={() => setProfileMenuAnchor(null)} sx={{ gap: 1.2, color: ink }}>
            <EditOutlinedIcon sx={{ color: accent, fontSize: 19 }} />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 760 }}>Edit Profile</Typography>
              <Typography sx={{ color: muted, fontSize: 12 }}>Customize your public profile</Typography>
            </Box>
          </MenuItem>
          <MenuItem component={Link} href="/account" selected={page === "account"} onClick={() => setProfileMenuAnchor(null)} sx={{ gap: 1.2, color: ink }}>
            <SettingsOutlinedIcon sx={{ color: accent, fontSize: 19 }} />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 760 }}>Account Settings</Typography>
              <Typography sx={{ color: muted, fontSize: 12 }}>Email, password, security</Typography>
            </Box>
          </MenuItem>
          <Divider sx={{ borderColor: border, my: 0.5 }} />
          {isAuthEnabled ? (
            <CloudProfileActions onClose={() => setProfileMenuAnchor(null)} />
          ) : (
            <Box sx={{ px: 1.5, py: 1 }}>
              <Typography sx={{ color: muted, fontSize: 12, lineHeight: 1.45 }}>Local mode is active. Add Clerk and Convex environment variables to enable account sync.</Typography>
            </Box>
          )}
        </Menu>
      </Box>
    </Box>
  );
}

function CloudProfileActions({ onClose }: { onClose: () => void }) {
  const { isSignedIn, openSignIn, openSignUp, signOut } = useAppAuth();

  if (isSignedIn) {
    return (
      <MenuItem
        onClick={() => {
          onClose();
          signOut();
        }}
        sx={{ gap: 1.2, color: ink }}
      >
        <Button fullWidth variant="outlined" sx={{ borderColor: border, color: dangerColor, fontSize: 13, fontWeight: 720 }}>
          Sign Out
        </Button>
      </MenuItem>
    );
  }

  return (
    <Stack sx={{ px: 1, py: 0.75, gap: 0.8 }}>
      <Button
        fullWidth
        variant="contained"
        onClick={() => {
          onClose();
          openSignUp();
        }}
        sx={{ bgcolor: accent, color: "#fff", fontSize: 13, fontWeight: 720, "&:hover": { bgcolor: accent } }}
      >
        Create Account
      </Button>
      <Button
        fullWidth
        variant="outlined"
        onClick={() => {
          onClose();
          openSignIn();
        }}
        sx={{ borderColor: border, color: accent, fontSize: 13, fontWeight: 720 }}
      >
        Sign In
      </Button>
    </Stack>
  );
}

function AccountSettingsPage() {
  const { isSignedIn, isLoaded, openSignIn, openSignUp } = useAppAuth();

  return (
    <PageFrame title="Account Settings" subtitle="Manage your private login details separately from your public CutLab profile.">
      {!isLoaded ? (
        <Paper sx={{ ...panelSx, p: 3, display: "grid", placeItems: "center", minHeight: 280 }}>
          <Stack alignItems="center" gap={1.2}>
            <CircularProgress size={28} sx={{ color: accent }} />
            <Typography sx={{ color: muted, fontSize: 13 }}>Loading account controls...</Typography>
          </Stack>
        </Paper>
      ) : !isSignedIn ? (
        <Paper sx={{ ...panelSx, p: { xs: 2.2, md: 3 } }}>
          <Stack gap={1.4} sx={{ maxWidth: 620 }}>
            <Typography sx={{ color: ink, fontSize: 24, fontWeight: 760 }}>Account required</Typography>
            <Typography sx={{ color: muted, fontSize: 14, lineHeight: 1.6 }}>
              Local mode does not have an account record, email, password, or connected login provider. Sign in or create an account to manage private account settings.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
              <Button variant="contained" onClick={() => openSignUp()} sx={{ bgcolor: accent, color: "#fff", borderRadius: "6px", fontWeight: 760, "&:hover": { bgcolor: accent } }}>Create Account</Button>
              <Button variant="outlined" onClick={() => openSignIn()} sx={outlineButtonSx}>Sign In</Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Stack gap={1.5}>
          <Paper sx={{ ...panelSx, p: { xs: 1, md: 1.4 }, bgcolor: softPanel }}>
            <Box
              sx={{
                "& .cl-rootBox": { width: "100%" },
                "& .cl-cardBox": { width: "100%", boxShadow: "none", border: `1px solid ${border}`, borderRadius: "8px" },
                "& .cl-card": { boxShadow: "none" },
                "& .cl-navbar": { borderColor: border },
                "& .cl-pageScrollBox": { paddingBlock: 1 }
              }}
            >
              <UserProfile routing="hash" />
            </Box>
          </Paper>
          <Button
            component={Link}
            href="/profile/edit"
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            sx={{ ...outlineButtonSx, width: "fit-content", alignSelf: "flex-end" }}
          >
            Edit Public Profile
          </Button>
        </Stack>
      )}
    </PageFrame>
  );
}

function MobileNav({ page, settings }: { page: PageKey; settings: SettingsState }) {
  return (
    <Box sx={{ display: { xs: "block", lg: "none" }, position: "fixed", zIndex: 20, top: 0, left: 0, right: 0, bgcolor: panel, borderBottom: `1px solid ${border}` }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.4 }}>
        <Stack component={Link} href="/" aria-label="Go to dashboard" direction="row" alignItems="center" gap={1} sx={{ color: "inherit", textDecoration: "none", minWidth: 0 }}>
          <CutLabMark size={34} />
        </Stack>
        <NotificationBell settings={settings} />
      </Stack>
      <Box sx={{ px: 1.5, pb: 1.2, overflowX: "auto", scrollbarWidth: "none" }}>
        <Stack direction="row" gap={0.7} sx={{ width: "max-content" }}>
          {navigationItems.map((item) => (
            <Button
              key={item.key}
              component={Link}
              href={item.href}
              startIcon={item.icon}
              sx={{
                height: 34,
                px: 1.2,
                flexShrink: 0,
                borderRadius: "6px",
                color: item.pages.includes(page) ? accent : muted,
                bgcolor: item.pages.includes(page) ? activeBg : "transparent",
                fontSize: 12,
                fontWeight: item.pages.includes(page) ? 760 : 650,
                "& .MuiButton-startIcon": { mr: 0.7 },
                "& .MuiButton-startIcon svg": { fontSize: 17 }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

function AppToast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  const reduceMotion = useHydratedReducedMotion();
  const palette = toast?.tone === "warning"
    ? { bg: "var(--app-warning-bg, rgba(245,166,35,0.14))", fg: warningColor, border }
    : toast?.tone === "info"
      ? { bg: activeBg, fg: accent, border }
      : { bg: "var(--app-success-bg, rgba(35,181,142,0.14))", fg: successColor, border };

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.message}
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="app-toast-position"
          style={{ position: "fixed", right: 16, zIndex: 50, width: "min(360px, calc(100vw - 32px))" }}
        >
          <Paper
            role="status"
            sx={{
              px: 1.5,
              py: 1.1,
              bgcolor: palette.bg,
              color: palette.fg,
              border: `1px solid ${palette.border}`,
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              maxWidth: 360,
              boxShadow: "var(--app-shadow-2)"
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 720 }}>{toast.message}</Typography>
            <Button size="small" aria-label="Dismiss notification" onClick={onClose} sx={{ minWidth: 28, width: 28, height: 28, color: palette.fg, p: 0 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </Button>
          </Paper>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function NavButton({ active, href, icon, children, collapsed = false }: { active: boolean; href: string; icon: React.ReactNode; children: React.ReactNode; collapsed?: boolean }) {
  const button = (
    <Button
      fullWidth={!collapsed}
      component={Link}
      href={href}
      startIcon={icon}
      aria-label={collapsed ? String(children) : undefined}
      sx={{
        justifyContent: collapsed ? "center" : "flex-start",
        height: 42,
        minWidth: collapsed ? 48 : undefined,
        width: collapsed ? 48 : "100%",
        px: collapsed ? 0 : 1.5,
        mx: collapsed ? "auto" : 0,
        borderRadius: "4px",
        color: active ? ink : muted,
        bgcolor: active ? activeBg : "transparent",
        fontSize: 14,
        fontWeight: active ? 760 : 600,
        borderLeft: `2px solid ${active ? accent : "transparent"}`,
        "& .MuiButton-startIcon": { mr: collapsed ? 0 : 1 },
        "& .MuiButton-startIcon svg": { fontSize: 19 },
        "&:hover": { bgcolor: hoverBg, color: active ? accent : ink }
      }}
    >
      {collapsed ? null : children}
    </Button>
  );
  return collapsed ? <Tooltip title={children} placement="right">{button}</Tooltip> : button;
}

function AppLoadingStatus() {
  return (
    <LinearProgress
      variant="indeterminate"
      aria-live="polite"
      sx={{
        position: "fixed",
        top: { xs: 86, lg: 0 },
        left: { xs: 0, lg: `${sidebarWidth}px` },
        right: 0,
        height: 2,
        zIndex: 1450,
        bgcolor: "transparent",
        "& .MuiLinearProgress-bar": { bgcolor: accent }
      }}
    />
  );
}

function WorkspaceLoadingPage() {
  return (
    <div className="mx-auto min-h-[calc(100dvh-56px)] w-full max-w-[1580px] animate-pulse px-3 py-4 sm:px-5 lg:px-6 lg:py-5" aria-label="Loading workspace" aria-busy="true">
      <div className="h-7 w-56 rounded-md bg-[var(--app-soft-panel)]" />
      <div className="mt-2 h-3 w-80 max-w-full rounded bg-[var(--app-soft-panel)]" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]" />)}
      </div>
      <div className="mt-4 h-[420px] rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]" />
    </div>
  );
}

function WelcomeChoiceDialog({
  open,
  onChooseLocal,
  onCreateAccount,
  onSignIn
}: {
  open: boolean;
  onChooseLocal: () => void;
  onCreateAccount: () => void;
  onSignIn: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {}}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "10px" } }}
    >
      <DialogTitle sx={{ fontSize: 28, fontWeight: 760, pb: 1 }}>Choose how to start</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          <Typography sx={{ color: muted, fontSize: 14 }}>
            Use CutLab locally on this device, or create an account to sync your data. Account setup currently supports username plus email or GitHub.
          </Typography>
          <Paper sx={{ ...panelSx, p: 2 }}>
            <Typography sx={{ color: ink, fontSize: 18, fontWeight: 760 }}>Continue without account</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 0.7 }}>
              Keep everything in this browser only. Good for personal use on one device.
            </Typography>
            <Button variant="outlined" onClick={onChooseLocal} sx={{ ...outlineButtonSx, mt: 2 }}>
              Use Locally
            </Button>
          </Paper>
          <Paper sx={{ ...panelSx, p: 2 }}>
            <Typography sx={{ color: ink, fontSize: 18, fontWeight: 760 }}>Create or use an account</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 0.7 }}>
              Sign up with username and email or continue with GitHub. GitHub sign-in will import your GitHub avatar and username into your profile defaults.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.2} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={onCreateAccount} sx={{ bgcolor: accent, color: "#fff", "&:hover": { bgcolor: accent } }}>
                Create Account
              </Button>
              <Button variant="outlined" onClick={onSignIn} sx={outlineButtonSx}>
                Sign In
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function DashboardPage(props: {
  stats: { total: number; active: number; unpaid: number; earned: number; salaryEdits: number; salaryBatchProgress: number };
  projects: WorkItem[];
  visibleProjects: WorkItem[];
  sessionActivity: DashboardActivity[];
  teamActivity: Array<{ _id: string; actorName: string; kind: string; projectId?: string; message: string; createdAt: string }>;
  teamName?: string;
  teamLoading: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: ProjectStatus | "All";
  setStatusFilter: (value: ProjectStatus | "All") => void;
  kindFilter: ProjectKind;
  setKindFilter: (value: ProjectKind) => void;
  clientFilter: string;
  setClientFilter: (value: string) => void;
  clientOptions: string[];
  projectTagOptions: string[];
  dueFilter: DueFilter;
  setDueFilter: (value: DueFilter) => void;
  billingFilter: "ALL" | "Paid" | "Unpaid";
  setBillingFilter: (value: "ALL" | "Paid" | "Unpaid") => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  onNewProject: () => void;
  onViewProject: (item: WorkItem) => void;
  onEditProject: (item: WorkItem) => void;
  onDeleteProject: (id: string) => void;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProject: (project: WorkItem) => boolean;
}) {
  const settings = useTrackerSettings();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState<DashboardPipelineStage | "All">("All");
  const [activityTab, setActivityTab] = useState<"recent" | "team">("recent");
  const activeFilterCount = [
    props.statusFilter !== "All",
    props.kindFilter !== "ALL",
    props.clientFilter !== "ALL",
    props.dueFilter !== "ALL",
    props.billingFilter !== "ALL"
  ].filter(Boolean).length;
  const pipeline = dashboardPipeline(props.projects);
  const upcomingDeliveries = dashboardUpcomingDeliveries(props.projects);
  const pendingFeedback = pipeline.find((stage) => stage.key === "Review")?.count ?? 0;
  const salaryBatchSize = normalizedSalaryBatchSize(settings.salaryBatchSize);
  const salaryProgress = props.stats.salaryEdits > 0 && props.stats.salaryBatchProgress === 0 ? salaryBatchSize : props.stats.salaryBatchProgress;
  const salaryPercent = Math.min(100, Math.round((salaryProgress / salaryBatchSize) * 100));
  const recentProjectActivity = dashboardProjectActivity(props.projects, props.sessionActivity);
  const activeProjectCount = props.projects.filter((project) => !isDoneStatus(project.status) && project.status !== "Cancelled").length;
  const tableProjects = pipelineFilter === "All"
    ? props.visibleProjects
    : props.visibleProjects.filter((project) => dashboardProjectStage(project) === pipelineFilter);
  const projectsCreatedThisWeek = props.projects.filter((project) => createdTime(project) >= addDays(todayDate(), -7).getTime()).length;

  function clearFilters() {
    props.setQuery("");
    props.setStatusFilter("All");
    props.setKindFilter("ALL");
    props.setClientFilter("ALL");
    props.setDueFilter("ALL");
    props.setBillingFilter("ALL");
    props.setSortKey("createdAt_desc");
    setPipelineFilter("All");
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1680, mx: "auto", px: { xs: 2, md: 4, xl: 5 }, pt: { xs: 2.5, md: 3.5 }, pb: 5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} gap={1.5} sx={{ mb: 1.75 }}>
        <Box>
          <SectionEyebrow>CutLab / Command center</SectionEyebrow>
          <Typography sx={{ fontSize: { xs: 34, md: 44 }, color: ink, fontWeight: 660, lineHeight: 1.02, fontFamily: headingFont, mt: 0.7 }}>Production overview</Typography>
          <Typography sx={{ fontSize: 13.5, color: muted, mt: 0.7 }}>Deadlines, project flow, earnings, and team activity in one working view.</Typography>
        </Box>
        <Stack direction="row" alignItems="center" justifyContent={{ xs: "space-between", sm: "flex-end" }} gap={1.5}>
          <Button
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={props.onNewProject}
            disabled={!props.canCreateProjects}
            sx={{
              borderColor: border,
              color: accent,
              bgcolor: panel,
              height: 44,
              px: 2,
              borderRadius: "6px",
              fontSize: 14,
              fontWeight: 720,
              whiteSpace: "nowrap",
              "&:hover": { borderColor: accent, bgcolor: hoverBg }
            }}
          >
            New Project
          </Button>
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", color: ink }}>
            <NotificationsNoneOutlinedIcon />
          </Box>
        </Stack>
      </Stack>

      <Box sx={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, py: 1.5, mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(260px, 1fr) minmax(160px, 220px) auto"
            },
            gap: 1.25,
            alignItems: "end"
          }}
        >
          <LabeledControl label="Find a project">
            <TextField
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder="Search title, client, or notes..."
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: muted, fontSize: 19, mr: 1 }} />
              }}
              sx={{
                minWidth: 0,
                "& .MuiOutlinedInput-root": { height: 42, bgcolor: panel, borderRadius: "5px", fontSize: 14 }
              }}
            />
          </LabeledControl>
          <LabeledControl label="Sort">
            <CompactSelect value={props.sortKey} options={sortOptions} labels={sortLabels} onChange={(value) => props.setSortKey(value as SortKey)} width="100%" />
          </LabeledControl>
          <Button
            variant={activeFilterCount ? "contained" : "outlined"}
            startIcon={<TuneOutlinedIcon />}
            onClick={() => setFiltersExpanded((value) => !value)}
            sx={{ ...outlineButtonSx, height: 42, whiteSpace: "nowrap", bgcolor: activeFilterCount ? activeBg : undefined }}
          >
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </Button>
        </Box>
        <Accordion
          expanded={filtersExpanded}
          onChange={(_, expanded) => setFiltersExpanded(expanded)}
          disableGutters
          elevation={0}
          sx={{ bgcolor: "transparent", "&::before": { display: "none" }, "& .MuiAccordionSummary-root": { display: "none" } }}
        >
          <AccordionSummary />
          <AccordionDetails sx={{ px: 0, pt: 1.5, pb: 0 }}>
            <Divider sx={{ borderColor: border, mb: 1.5 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr) auto" }, gap: 1.25, alignItems: "end" }}>
              <LabeledControl label="Status">
                <CompactSelect value={props.statusFilter} options={["All", ...statusOptions]} onChange={(value) => props.setStatusFilter(value as ProjectStatus | "All")} width="100%" />
              </LabeledControl>
              <LabeledControl label="Tag">
                <CompactSelect value={props.kindFilter} options={props.projectTagOptions} labels={{ ALL: "All Tags", [settings.salaryWorkType]: "Salary Queue" }} onChange={(value) => props.setKindFilter(value as ProjectKind)} width="100%" />
              </LabeledControl>
              <LabeledControl label="Client">
                <CompactSelect value={props.clientFilter} options={props.clientOptions} labels={{ ALL: "All Clients" }} onChange={props.setClientFilter} width="100%" />
              </LabeledControl>
              <LabeledControl label="Due date">
                <CompactSelect value={props.dueFilter} options={dueOptions} labels={{ ALL: "Any Date" }} onChange={(value) => props.setDueFilter(value as DueFilter)} width="100%" />
              </LabeledControl>
              <LabeledControl label="Payment">
                <CompactSelect value={props.billingFilter} options={billingOptions} labels={{ ALL: "All Payments", Paid: "Collected", Unpaid: "Needs Action" }} onChange={(value) => props.setBillingFilter(value as "ALL" | "Paid" | "Unpaid")} width="100%" />
              </LabeledControl>
              <Button size="small" onClick={clearFilters} disabled={!activeFilterCount && !props.query} sx={{ color: muted, height: 42, whiteSpace: "nowrap" }}>
                Clear
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      <MetricRail
        sx={{ mb: 3 }}
        items={[
          { label: "Active projects", value: String(activeProjectCount), helper: `${props.stats.total} tracked`, icon: <PlayArrowRoundedIcon />, tone: "accent" },
          { label: "Delivered", value: String(props.projects.filter((project) => isDoneStatus(project.status)).length), helper: "Completed work", icon: <CheckCircleOutlineIcon />, tone: "success" },
          { label: "In review", value: String(pendingFeedback), helper: "Awaiting feedback", icon: <ChatBubbleOutlineOutlinedIcon />, tone: "warning" },
          { label: "Collected", value: money(props.stats.earned, settings.currencyCode), helper: "Delivered earnings", icon: <InsertChartOutlinedIcon /> },
          { label: "Batch progress", value: `${salaryProgress}/${salaryBatchSize}`, helper: `${salaryPercent}% complete`, icon: <FileDownloadOutlinedIcon />, tone: "accent" }
        ]}
      />

      <SectionModule
        title="Production flow"
        description={projectsCreatedThisWeek ? `${projectsCreatedThisWeek} new project${projectsCreatedThisWeek === 1 ? "" : "s"} entered the workspace this week.` : "Live distribution across the editing pipeline."}
        sx={{ mb: 3 }}
        aside={
          <Stack gap={2.25}>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Box>
                  <Typography sx={{ color: ink, fontSize: 14, fontWeight: 740 }}>Deadline queue</Typography>
                  <Typography sx={{ color: muted, fontSize: 11.5, mt: 0.2 }}>Next deliveries</Typography>
                </Box>
              </Stack>
              <UpcomingDeliveries projects={upcomingDeliveries} settings={settings} onViewProject={props.onViewProject} onNewProject={props.onNewProject} compact />
            </Box>
            <Box sx={{ borderTop: `1px solid ${border}`, pt: 1.75 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography sx={{ color: ink, fontSize: 14, fontWeight: 740 }}>Salary batch</Typography>
                <Typography sx={{ color: salaryPercent >= 100 ? successColor : accent, fontSize: 20, fontWeight: 700 }}>{salaryPercent}%</Typography>
              </Stack>
              <Typography sx={{ color: muted, fontSize: 11.5, mt: 0.25 }}>{money(normalizedSalaryBatchAmount(settings.salaryBatchAmount), settings.currencyCode)} payout target</Typography>
              <LinearProgress variant="determinate" value={salaryPercent} sx={{ height: 5, mt: 1.25, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: salaryPercent >= 100 ? successColor : accent } }} />
              <Typography sx={{ color: muted, fontSize: 11, mt: 0.65 }}>{Math.max(0, salaryBatchSize - salaryProgress)} edits remaining</Typography>
            </Box>
          </Stack>
        }
      >
        <WorkflowDistributionChart data={pipeline.map((stage) => ({ label: stage.key, value: stage.count }))} />
        <WorkflowPipeline
          stages={pipeline}
          activeStage={pipelineFilter}
          onSelect={(stage) => setPipelineFilter((current) => current === stage ? "All" : stage)}
          compact
        />
      </SectionModule>

      <DashboardSection
        title="Activity"
        subtitle={activityTab === "recent" ? "Latest project changes" : props.teamName ? `Latest actions in ${props.teamName}` : "Shared workspace activity"}
        compact
        sx={{ mb: 1.75 }}
      >
        <Tabs
          value={activityTab}
          onChange={(_, value: "recent" | "team") => setActivityTab(value)}
          sx={{ minHeight: 32, mb: 1, borderBottom: `1px solid ${border}`, "& .MuiTabs-indicator": { bgcolor: accent }, "& .MuiTab-root": { minHeight: 32, py: 0.5, px: 1.25, minWidth: 0, fontSize: 12, textTransform: "none" } }}
        >
          <Tab value="recent" label="Recent Activity" />
          <Tab value="team" label="Team Activity" />
        </Tabs>
        {activityTab === "recent" ? (
          <DashboardActivityFeed activity={recentProjectActivity} projects={props.projects} emptyAsset="projects" compact />
        ) : props.teamLoading ? (
          <DashboardActivitySkeleton />
        ) : props.teamName ? (
          <DashboardActivityFeed
            activity={props.teamActivity.map((activity) => ({
              id: activity._id,
              kind: "team",
              message: activity.message,
              projectId: activity.projectId,
              actor: activity.actorName,
              createdAt: activity.createdAt
            }))}
            projects={props.projects}
            emptyAsset="team"
            compact
          />
        ) : (
          <CompactDashboardEmpty
            title="No team activity"
            body="Create or join a workspace to see shared updates."
            assetKey="team"
          />
        )}
      </DashboardSection>

      <Box sx={{ width: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1.2 }}>
          <Box>
            <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>All Projects</Typography>
            {pipelineFilter !== "All" ? <Typography sx={{ color: accent, fontSize: 12, mt: 0.25 }}>{pipelineFilter} stage selected</Typography> : null}
          </Box>
          <Typography sx={{ color: muted, fontSize: 13 }}>{tableProjects.length} shown</Typography>
        </Stack>
        {tableProjects.length ? (
          <Paper sx={{ bgcolor: panel, border: `1px solid ${border}`, borderRadius: "6px", overflow: "hidden" }}>
            <ProjectTableHeader />
            <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
              {tableProjects.map((project) => (
                <ProjectRow key={project.id} project={project} canEdit={props.canEditProjects || !project.teamId} canDelete={props.canDeleteProject(project)} onView={() => props.onViewProject(project)} onEdit={() => props.onEditProject(project)} onDelete={() => props.onDeleteProject(project.id)} />
              ))}
            </Stack>
          </Paper>
        ) : (
          <Paper sx={panelSx}>
            <EmptyPanel
              title={props.projects.length ? "No projects match this view" : "No projects yet"}
              body={props.projects.length ? "Clear filters or select another pipeline stage to return to the full project list." : "Create your first project to start the production pipeline."}
              assetKey="projects"
              action={props.projects.length
                ? <Button variant="outlined" onClick={clearFilters} sx={outlineButtonSx}>Clear Dashboard Filters</Button>
                : <Button variant="contained" startIcon={<AddIcon />} onClick={props.onNewProject} sx={{ bgcolor: accent, "&:hover": { bgcolor: accent } }}>Create Project</Button>}
            />
          </Paper>
        )}
      </Box>
    </Box>
  );
}

function ProjectDirectoryPage({
  personalProjects,
  teamProjects,
  teamName,
  onNewProject,
  onViewProject,
  onEditProject,
  onDeleteProject,
  canCreateProjects,
  canCreateTeamProjects,
  canEditProjects,
  canDeleteProject
}: {
  personalProjects: WorkItem[];
  teamProjects: WorkItem[];
  teamName?: string;
  onNewProject: (scope: "personal" | "team") => void;
  onViewProject: (item: WorkItem) => void;
  onEditProject: (item: WorkItem) => void;
  onDeleteProject: (id: string) => void;
  canCreateProjects: boolean;
  canCreateTeamProjects: boolean;
  canEditProjects: boolean;
  canDeleteProject: (project: WorkItem) => boolean;
}) {
  const [workspace, setWorkspace] = useState<"personal" | "team">("personal");
  const projects = workspace === "personal" ? personalProjects : teamProjects;
  const hasTeam = Boolean(teamName);
  const activeCount = projects.filter((project) => !isDoneStatus(project.status) && project.status !== "Cancelled").length;
  const deliveredCount = projects.filter((project) => isDoneStatus(project.status)).length;
  const reviewCount = projects.filter((project) => dashboardProjectStage(project) === "Review").length;

  useEffect(() => {
    if (!hasTeam && workspace === "team") setWorkspace("personal");
  }, [hasTeam, workspace]);

  return (
    <PageFrame
      title="Projects"
      subtitle="Keep private work separate from projects shared with your team workspace."
      action={
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => onNewProject(workspace)}
          disabled={(workspace === "personal" && !canCreateProjects) || (workspace === "team" && (!hasTeam || !canCreateTeamProjects))}
          sx={outlineButtonSx}
        >
          {workspace === "team" ? "New Team Project" : "New Personal Project"}
        </Button>
      }
    >
      <Box sx={{ mb: 2, maxWidth: "100%", borderBottom: `1px solid ${border}` }}>
        <Stack direction="row" gap={2}>
          <Button
            onClick={() => setWorkspace("personal")}
            sx={{
              minHeight: 44,
              px: 0,
              color: workspace === "personal" ? accent : muted,
              bgcolor: "transparent",
              fontWeight: workspace === "personal" ? 780 : 650,
              borderRadius: 0,
              borderBottom: `2px solid ${workspace === "personal" ? accent : "transparent"}`,
              "&:hover": { bgcolor: "transparent", color: ink }
            }}
          >
            My Projects
            <Chip label={personalProjects.length} size="small" sx={{ ml: 1, height: 21, bgcolor: panel, color: workspace === "personal" ? accent : muted, borderRadius: "4px" }} />
          </Button>
          <Tooltip title={hasTeam ? `Shared projects in ${teamName}` : "Join or create a team workspace first"}>
            <span>
              <Button
                disabled={!hasTeam}
                onClick={() => setWorkspace("team")}
                sx={{
                  minHeight: 44,
                  px: 0,
                  color: workspace === "team" ? accent : muted,
                  bgcolor: "transparent",
                  fontWeight: workspace === "team" ? 780 : 650,
                  borderRadius: 0,
                  borderBottom: `2px solid ${workspace === "team" ? accent : "transparent"}`,
                  "&:hover": { bgcolor: "transparent", color: ink }
                }}
              >
                Team Projects
                <Chip label={teamProjects.length} size="small" sx={{ ml: 1, height: 21, bgcolor: panel, color: workspace === "team" ? accent : muted, borderRadius: "4px" }} />
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>
      <MetricRail
        sx={{ mb: 3 }}
        items={[
          { label: "All projects", value: String(projects.length), helper: workspace === "team" ? "Shared workspace" : "Personal workspace", icon: <FolderOpenOutlinedIcon />, tone: "accent" },
          { label: "Active", value: String(activeCount), helper: "In production", icon: <PlayArrowRoundedIcon /> },
          { label: "In review", value: String(reviewCount), helper: "Client feedback", icon: <ChatBubbleOutlineOutlinedIcon />, tone: "warning" },
          { label: "Delivered", value: String(deliveredCount), helper: "Completed edits", icon: <CheckCircleOutlineIcon />, tone: "success" }
        ]}
      />
      <SectionModule
        title={workspace === "team" ? teamName || "Team workspace" : "Personal workspace"}
        description={workspace === "team" ? "Projects visible to members based on workspace permissions." : "Private projects visible only to your account."}
        action={<Typography sx={{ color: muted, fontSize: 12 }}>{projects.length} records</Typography>}
      >
        <Box sx={{ bgcolor: panel, borderBottom: `1px solid ${border}` }}>
          <ProjectTableHeader />
          <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
            {projects.length ? projects.map((project) => (
              <ProjectRow key={project.id} project={project} canEdit={canEditProjects || !project.teamId} canDelete={canDeleteProject(project)} onView={() => onViewProject(project)} onEdit={() => onEditProject(project)} onDelete={() => onDeleteProject(project.id)} />
            )) : (
              <EmptyPanel
                title={workspace === "team" ? "No team projects yet" : "No personal projects yet"}
                body={workspace === "team" ? "Create a shared project for assignments, comments, and team activity." : "Create a private project for your own editing work."}
              />
            )}
          </Stack>
        </Box>
      </SectionModule>
    </PageFrame>
  );
}

function ClientsDesignPage({
  projects,
  projectTagOptions,
  settings,
  onAddClient
}: {
  projects: WorkItem[];
  projectTagOptions: string[];
  settings: SettingsState;
  onAddClient: (clientName: string) => void;
}) {
  const clients = buildClientSummaries(projects, settings.customClients);
  const [clientQuery, setClientQuery] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<"ALL" | "Active" | "Inactive">("ALL");
  const [clientWorkFilter, setClientWorkFilter] = useState<ProjectKind>("ALL");
  const [clientFeedbackFilter, setClientFeedbackFilter] = useState<"ALL" | "Awaiting" | "Approved">("ALL");
  const [selectedClientName, setSelectedClientName] = useState("");
  const [selectedClientTab, setSelectedClientTab] = useState<ClientDetailTab>("Overview");

  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [addClientError, setAddClientError] = useState("");

  const filteredClients = clients.filter((client) => {
    const clientProjects = projects.filter((project) => isSameClient(project.client, client.name));
    const searchText = `${client.name} ${client.latestProject} ${clientProjects.map((project) => `${project.title} ${project.notes} ${project.workType}`).join(" ")}`.toLowerCase();
    const query = clientQuery.trim().toLowerCase();
    const feedback = clientFeedbackStatus(clientProjects);
    const matchesSearch = !query || searchText.includes(query);
    const matchesStatus =
      clientStatusFilter === "ALL" ||
      (clientStatusFilter === "Active" && client.activeCount > 0) ||
      (clientStatusFilter === "Inactive" && client.activeCount === 0);
    const matchesWork = clientWorkFilter === "ALL" || clientProjects.some((project) => project.workType === clientWorkFilter);
    const matchesFeedback = clientFeedbackFilter === "ALL" || feedback === clientFeedbackFilter;
    return matchesSearch && matchesStatus && matchesWork && matchesFeedback;
  });

  const selectedClient = filteredClients.find((client) => client.name === selectedClientName) ?? filteredClients[0] ?? clients[0];
  const selectedProjects = selectedClient ? projects.filter((project) => isSameClient(project.client, selectedClient.name)) : [];
  const activeProjects = projects.filter((project) => !isDoneStatus(project.status)).length;
  const deliveredProjects = projects.length - activeProjects;
  const selectedFeedbackStatus = selectedProjects.length ? clientFeedbackStatus(selectedProjects) : "Approved";
  const pendingRevisions = selectedProjects.filter((project) => project.status === "In Progress" || project.status === "Planned");
  const clientTabs: { key: ClientDetailTab; label: string }[] = [
    { key: "Overview", label: "Overview" },
    { key: "Projects", label: `Projects (${selectedProjects.length})` },
    { key: "Files", label: "Files" },
    { key: "Activity", label: "Activity" }
  ];

  function handleSaveClient() {
    const clientName = newClientName.trim();
    if (!clientName) {
      setAddClientError("Client name is required.");
      return;
    }
    const existingClient = findExistingClientName(clientName, buildClientOptions(projects, settings.customClients));
    if (existingClient) {
      setAddClientError(`Client already exists as "${existingClient}". Select it from the project client dropdown instead.`);
      setSelectedClientName(existingClient);
      return;
    }
    onAddClient(clientName);
    setNewClientName("");
    setAddClientError("");
    setAddClientOpen(false);
    setSelectedClientName(clientName);
  }

  function clearClientFilters() {
    setClientQuery("");
    setClientStatusFilter("ALL");
    setClientWorkFilter("ALL");
    setClientFeedbackFilter("ALL");
  }

  return (
    <PageFrame
      title="Clients"
      subtitle="Manage saved clients and the client names attached to projects."
      action={
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setAddClientError(""); setAddClientOpen(true); }} sx={outlineButtonSx}>New Client</Button>
      }
    >
      <MetricRail
        sx={{ mb: 3 }}
        items={[
          { label: "Clients", value: String(clients.length), helper: "Saved relationships", icon: <PeopleAltOutlinedIcon />, tone: "accent" },
          { label: "Active projects", value: String(activeProjects), helper: "Currently in production", icon: <PlayArrowRoundedIcon /> },
          { label: "Delivered", value: String(deliveredProjects), helper: "Completed client work", icon: <CheckCircleOutlineIcon />, tone: "success" },
          { label: "Awaiting feedback", value: String(projects.filter((project) => dashboardProjectStage(project) === "Review").length), helper: "Review queue", icon: <ChatBubbleOutlineOutlinedIcon />, tone: "warning" }
        ]}
      />
      {!clients.length ? (
        <Paper sx={panelSx}>
          <EmptyPanel
            title="No clients yet"
            body="Create a client directly or add a client name while creating your first project."
            assetKey="clients"
            action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => { setAddClientError(""); setAddClientOpen(true); }} sx={{ bgcolor: accent, "&:hover": { bgcolor: accent } }}>Create Client</Button>}
          />
        </Paper>
      ) : (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 390px" }, borderBlock: `1px solid ${border}`, bgcolor: panel }}>
        <Box sx={{ minWidth: 0, borderRight: { xl: `1px solid ${border}` } }}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "end" }} gap={1.2} sx={{ px: 2, py: 2 }}>
            <TextField
              value={clientQuery}
              onChange={(event) => setClientQuery(event.target.value)}
              placeholder="Search clients or projects..."
              size="small"
              InputProps={{ startAdornment: <SearchIcon sx={{ color: muted, fontSize: 18, mr: 1 }} /> }}
              sx={{ width: { xs: "100%", md: 300 }, "& .MuiInputBase-root": { height: 42, borderRadius: "6px", bgcolor: panel } }}
            />
            <CompactSelect value={clientStatusFilter} options={["ALL", "Active", "Inactive"]} labels={{ ALL: "All Clients" }} onChange={(value) => setClientStatusFilter(value as "ALL" | "Active" | "Inactive")} width={{ xs: "100%", md: 150 }} />
            <CompactSelect value={clientWorkFilter} options={["ALL", ...projectTagOptions]} labels={{ ALL: "All Work" }} onChange={(value) => setClientWorkFilter(value as ProjectKind)} width={{ xs: "100%", md: 150 }} />
            <CompactSelect value={clientFeedbackFilter} options={["ALL", "Awaiting", "Approved"]} labels={{ ALL: "Any Feedback" }} onChange={(value) => setClientFeedbackFilter(value as "ALL" | "Awaiting" | "Approved")} width={{ xs: "100%", md: 150 }} />
            <Button size="small" onClick={clearClientFilters} sx={{ color: muted, height: 42, px: 1.2, whiteSpace: "nowrap" }}>Clear Filters</Button>
            <Typography sx={{ color: muted, fontSize: 13, ml: { md: "auto" }, whiteSpace: "nowrap" }}>{filteredClients.length} shown</Typography>
          </Stack>
          <Box sx={{ display: { xs: "none", lg: "grid" }, gridTemplateColumns: "1.35fr 1fr 110px 110px 130px 120px minmax(120px, 0.9fr) 34px", gap: 2, px: 2, py: 1.1, bgcolor: headerPanel, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
            {["Client", "Contact", "Projects", "Status", "Next Delivery", "Feedback", "Notes", ""].map((heading) => <Typography key={heading || "actions"} sx={tableHeadingSx}>{heading}</Typography>)}
          </Box>
          <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
            {filteredClients.length ? filteredClients.map((client, index) => {
              const clientProjects = projects.filter((project) => isSameClient(project.client, client.name));
              const feedback = clientFeedbackStatus(clientProjects);
              return (
                <Box
                  key={client.name}
                  component="button"
                  type="button"
                  aria-label={`Open ${client.name} client details`}
                  onClick={() => setSelectedClientName(client.name)}
                  sx={{
                    width: "100%",
                    border: 0,
                    font: "inherit",
                    textAlign: "left",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "1.35fr 1fr 110px 110px 130px 120px minmax(120px, 0.9fr) 34px" },
                    gap: { xs: 1, lg: 2 },
                    alignItems: "center",
                    px: 2,
                    py: 1.45,
                    cursor: "pointer",
                    bgcolor: selectedClient?.name === client.name ? activeBg : panel,
                    color: "inherit",
                    "&:hover": { bgcolor: hoverBg }
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1.3} sx={{ minWidth: 0 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", color: index % 2 ? ink : "#fff", bgcolor: ["#111111", "#f3dfc1", "#e8edf9", "#e9efe4"][index % 4], border: `1px solid ${border}`, fontSize: 14, fontWeight: 760 }}>{initials(client.name)}</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{client.name}</Typography>
                      <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{client.latestProject || "No project notes"}</Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ minWidth: 0, display: { xs: "none", lg: "block" } }}>
                    <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 700 }}>{client.name}</Typography>
                    <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.35 }}>Project client</Typography>
                  </Box>
                  <Typography sx={{ display: { xs: "none", lg: "block" }, color: ink, fontSize: 18, fontWeight: 660 }}>{client.projectCount}<Box component="span" sx={{ display: "block", color: muted, fontSize: 12, fontWeight: 500 }}>{client.projectCount === 1 ? "project" : "projects"}</Box></Typography>
                  <Stack direction="row" alignItems="center" gap={0.7} sx={{ display: { xs: "none", lg: "flex" } }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: client.activeCount ? "#43a85b" : "#9ba0aa" }} />
                    <Typography sx={{ color: ink, fontSize: 13 }}>{client.activeCount ? "Active" : "Inactive"}</Typography>
                  </Stack>
                  <Typography sx={{ display: { xs: "none", lg: "block" }, color: muted, fontSize: 13 }}>{client.nextDue ? formatDate(client.nextDue, settings.dateFormat) : "-"}</Typography>
                  <Stack direction="row" alignItems="center" gap={0.7} sx={{ display: { xs: "none", lg: "flex" }, color: feedback === "Approved" ? successColor : muted }}>
                    {feedback === "Approved" ? <CheckCircleOutlineIcon sx={{ fontSize: 17 }} /> : <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 17 }} />}
                    <Typography sx={{ color: ink, fontSize: 13 }}>{feedback}</Typography>
                  </Stack>
                  <Typography noWrap sx={{ display: { xs: "none", lg: "block" }, color: muted, fontSize: 13 }}>{clientProjects[0]?.notes || client.latestProject || "No notes"}</Typography>
                  <MoreHorizIcon sx={{ display: { xs: "none", lg: "block" }, color: muted, fontSize: 19 }} />
                  <Stack direction="row" gap={1} sx={{ display: { xs: "flex", lg: "none" }, flexWrap: "wrap" }}>
                    <StatusChip status={client.activeCount ? "In Progress" : "Delivered"} />
                    <Chip label={`${client.projectCount} ${client.projectCount === 1 ? "project" : "projects"}`} size="small" sx={{ bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "5px" }} />
                    <Chip label={feedback} size="small" sx={{ bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "5px" }} />
                  </Stack>
                </Box>
              );
            }) : clients.length ? (
              <EmptyPanel title="No clients match these filters" body="Clear filters or edit a project client name to change this list." />
            ) : null}
          </Stack>
        </Box>
        <Box sx={{ p: 2.25, minWidth: 0, bgcolor: softPanel }}>
          {selectedClient ? (
            <>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                <Stack direction="row" alignItems="center" gap={1.3} sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 54, height: 54, borderRadius: "50%", bgcolor: "#111", color: "#fff", display: "grid", placeItems: "center", fontSize: 17, fontWeight: 760, flexShrink: 0 }}>{initials(selectedClient.name)}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>{selectedClient.name}</Typography>
                    <Typography noWrap sx={{ color: muted, fontSize: 13, mt: 0.35 }}>{selectedProjects[0]?.workType || "Video client"}</Typography>
                  </Box>
                </Stack>
                <Button aria-label="Close client details" onClick={() => setSelectedClientName("")} sx={{ minWidth: 30, width: 30, height: 30, color: muted, p: 0 }}>
                  <CloseIcon sx={{ fontSize: 19 }} />
                </Button>
              </Stack>
              <Stack gap={1.1} sx={{ mt: 2.3, pb: 2, borderBottom: `1px solid ${border}` }}>
                <ClientInfoRow icon={<MailOutlineIcon />} text="Contact email not set" />
                <ClientInfoRow icon={<PublicOutlinedIcon />} text={selectedProjects.length ? "Project-linked client record" : "Saved client record"} />
                <ClientInfoRow icon={<PlaceOutlinedIcon />} text="Saved with project records" />
              </Stack>
              <Stack direction="row" gap={1} sx={{ mt: 2, mb: 2, overflowX: "auto", scrollbarWidth: "none" }}>
                {clientTabs.map((tab) => (
                  <Button key={tab.key} size="small" onClick={() => setSelectedClientTab(tab.key)} sx={{ flexShrink: 0, color: selectedClientTab === tab.key ? accent : muted, borderBottom: selectedClientTab === tab.key ? `2px solid ${accent}` : "2px solid transparent", borderRadius: 0, px: 0.8, fontSize: 13, fontWeight: 720 }}>{tab.label}</Button>
                ))}
              </Stack>
              <ClientTabPanel
                tab={selectedClientTab}
                projects={selectedProjects}
                activeCount={selectedClient.activeCount}
                pendingRevisions={pendingRevisions}
                feedbackStatus={selectedFeedbackStatus}
                settings={settings}
              />
            </>
          ) : (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>No client selected</Typography>
              <Typography sx={{ color: muted, fontSize: 13, mt: 1 }}>Add a client name to a project to build this view.</Typography>
              </Box>
          )}
        </Box>
      </Box>
      )}
      <Dialog open={addClientOpen} onClose={() => setAddClientOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 760 }}>New Client</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1.5 }}>
            <TextField label="Client Name" placeholder="e.g. Acme Corp" value={newClientName} onChange={(e) => { setNewClientName(e.target.value); setAddClientError(""); }} fullWidth />
            <Typography sx={{ color: muted, fontSize: 12 }}>This creates a client option without creating a project. You can attach it to a project later.</Typography>
            {addClientError ? <Typography sx={{ color: dangerColor, fontSize: 13 }}>{addClientError}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddClientOpen(false)} sx={{ color: muted }}>Cancel</Button>
          <Button onClick={handleSaveClient} variant="contained" sx={{ bgcolor: accent, color: cutlab.color.softWhite, "&:hover": { bgcolor: "var(--app-highlight)", color: cutlab.color.charcoal } }}>Save Client</Button>
        </DialogActions>
      </Dialog>
    </PageFrame>
  );
}

function ClientTabPanel({
  tab,
  projects,
  activeCount,
  pendingRevisions,
  feedbackStatus,
  settings
}: {
  tab: ClientDetailTab;
  projects: WorkItem[];
  activeCount: number;
  pendingRevisions: WorkItem[];
  feedbackStatus: string;
  settings: SettingsState;
}) {
  const sortedProjects = [...projects].sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate));
  const recentActivity = [...projects].sort((a, b) => {
    const aTime = Date.parse(a.createdAt || `${a.startDate}T00:00:00`);
    const bTime = Date.parse(b.createdAt || `${b.startDate}T00:00:00`);
    return bTime - aTime;
  });

  if (tab === "Projects") {
    return (
      <Stack gap={1.1}>
        {sortedProjects.length ? sortedProjects.map((project) => (
          <Paper key={project.id} sx={{ p: 1.5, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.2}>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{project.title}</Typography>
                <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.3 }}>{project.workType} · Due {formatDate(project.dueDate, settings.dateFormat)}</Typography>
              </Box>
              <StatusChip status={project.status} />
            </Stack>
            {project.notes ? <Typography sx={{ color: muted, fontSize: 12, lineHeight: 1.45, mt: 1 }}>{project.notes}</Typography> : null}
          </Paper>
        )) : (
          <EmptyPanel title="No projects for this client" body="Assign this client name to a project to fill this list." />
        )}
      </Stack>
    );
  }

  if (tab === "Files") {
    return (
      <Stack gap={1.1}>
        {sortedProjects.length ? sortedProjects.map((project) => (
          <Paper key={project.id} sx={{ p: 1.5, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                <InsertDriveFileOutlinedIcon sx={{ color: muted, fontSize: 19, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{project.title}</Typography>
                  <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.3 }}>{project.workType} package</Typography>
                </Box>
              </Stack>
              <Typography sx={{ color: muted, fontSize: 12, flexShrink: 0 }}>{projectProgress(project.status)}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={projectProgress(project.status)} sx={{ height: 5, borderRadius: 99, bgcolor: progressTrack, mt: 1.1, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
          </Paper>
        )) : (
          <EmptyPanel title="No project packages yet" body="Project file packages are summarized from saved client projects." />
        )}
      </Stack>
    );
  }

  if (tab === "Activity") {
    return (
      <Stack gap={1.1}>
        {recentActivity.length ? recentActivity.map((project) => (
          <Paper key={project.id} sx={{ p: 1.5, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
            <Stack direction="row" alignItems="flex-start" gap={1.1}>
              <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: deadlineColor(project.status), mt: 0.65, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{project.status}: {project.title}</Typography>
                <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>
                  {isDoneStatus(project.status) ? "Delivered" : "Scheduled"} for {formatDate(project.dueDate, settings.dateFormat)}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )) : (
          <EmptyPanel title="No client activity yet" body="Saved projects for this client will create an activity trail." />
        )}
      </Stack>
    );
  }

  return (
    <Grid container spacing={1.2}>
      <Grid size={12}>
        <Paper sx={{ p: 1.5, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
            <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>Current Projects</Typography>
            <Typography sx={{ color: accent, fontSize: 12, fontWeight: 720 }}>{activeCount} active</Typography>
          </Stack>
          <Stack gap={1.1}>
            {projects.slice(0, 3).map((project) => (
              <Box key={project.id}>
                <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mb: 0.5 }}>
                  <Typography noWrap sx={{ color: ink, fontSize: 12, fontWeight: 700 }}>{project.title}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12 }}>{projectProgress(project.status)}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={projectProgress(project.status)} sx={{ height: 5, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
              </Box>
            ))}
            {!projects.length ? <Typography sx={{ color: muted, fontSize: 12 }}>No current projects.</Typography> : null}
          </Stack>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 12 }}>
        <Paper sx={{ p: 1.5, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel, minHeight: 146 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
            <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>Pending Revisions</Typography>
            <Chip label={pendingRevisions.length} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px", height: 22 }} />
          </Stack>
          <Stack gap={1.1}>
            {pendingRevisions.slice(0, 3).map((project) => (
              <Box key={project.id} sx={{ pl: 1.2, borderLeft: `2px solid ${deadlineColor(project.status)}` }}>
                <Typography noWrap sx={{ color: ink, fontSize: 12, fontWeight: 700 }}>{project.title}</Typography>
                <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.3 }}>{project.notes || project.status}</Typography>
              </Box>
            ))}
            {!pendingRevisions.length ? <Typography sx={{ color: muted, fontSize: 12 }}>No open revisions.</Typography> : null}
          </Stack>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 12 }}>
        <Paper sx={{ p: 1.5, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel, minHeight: 146 }}>
          <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>Deliverables</Typography>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            <Grid size={6}><MiniMetric label="Delivered" value={String(projects.filter((project) => isDoneStatus(project.status)).length)} /></Grid>
            <Grid size={6}><MiniMetric label="Packages" value={String(projects.length)} /></Grid>
            <Grid size={6}><MiniMetric label="Revisions" value={String(pendingRevisions.length)} /></Grid>
            <Grid size={6}><MiniMetric label="Feedback" value={feedbackStatus} /></Grid>
          </Grid>
        </Paper>
      </Grid>
      <Grid size={12}>
        <Paper sx={{ p: 1.5, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
            <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>Relationship Notes</Typography>
          </Stack>
          <Typography sx={{ color: muted, fontSize: 13, lineHeight: 1.55 }}>
            {projects.find((project) => project.notes)?.notes || "Project notes attached to this client will appear here."}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}

function CalendarDesignPage({ projects, settings }: { projects: WorkItem[]; settings: SettingsState }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const firstProjectDate = projects.find((project) => project.dueDate)?.dueDate;
    const date = firstProjectDate ? new Date(`${firstProjectDate}T00:00:00`) : todayDate();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(iso(todayDate()));
  const monthDays = calendarMonthDays(visibleMonth, settings.weekStart);
  const weekdays = orderedWeekdays(settings.weekStart);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth);
  const selectedProjects = projects
    .filter((project) => project.dueDate === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title));
  const monthProjectCount = projects.filter((project) => {
    const due = new Date(`${project.dueDate}T00:00:00`);
    return due.getFullYear() === visibleMonth.getFullYear() && due.getMonth() === visibleMonth.getMonth();
  }).length;

  function shiftMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday() {
    const today = todayDate();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(iso(today));
  }

  return (
    <PageFrame
      title="Calendar"
      subtitle="A delivery-date calendar for planned, active, and delivered work."
      action={<Button variant="outlined" startIcon={<CalendarTodayOutlinedIcon />} onClick={jumpToToday} sx={outlineButtonSx}>Today</Button>}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 360px" }, gap: 2 }}>
        <Paper sx={panelSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 2 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Button size="small" aria-label="Previous month" onClick={() => shiftMonth(-1)} sx={{ minWidth: 34, color: accent, border: `1px solid ${border}` }}>‹</Button>
              <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>{monthLabel}</Typography>
              <Button size="small" aria-label="Next month" onClick={() => shiftMonth(1)} sx={{ minWidth: 34, color: accent, border: `1px solid ${border}` }}>›</Button>
            </Stack>
            <Chip label={`${monthProjectCount} in month`} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px" }} />
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderTop: `1px solid ${border}`, borderLeft: `1px solid ${border}` }}>
            {weekdays.map((day) => (
              <Typography key={day} sx={{ px: 1, py: 1, color: muted, fontSize: 11, fontWeight: 760, textTransform: "uppercase", borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>{day}</Typography>
            ))}
            {monthDays.map((day) => {
              const key = iso(day.date);
              const dayProjects = projects.filter((project) => project.dueDate === key);
              const isCurrentMonth = day.date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedDate === key;
              const isToday = key === iso(todayDate());
              return (
                <Box
                  key={key}
                  component="button"
                  type="button"
                  aria-label={`Select ${formatDate(key, settings.dateFormat)} with ${dayProjects.length} scheduled ${dayProjects.length === 1 ? "delivery" : "deliveries"}`}
                  onClick={() => setSelectedDate(key)}
                  sx={{
                    border: 0,
                    font: "inherit",
                    textAlign: "left",
                    minHeight: { xs: 84, md: "clamp(72px, calc((100dvh - 470px) / 6), 96px)" },
                    p: 1,
                    cursor: "pointer",
                    borderRight: `1px solid ${border}`,
                    borderBottom: `1px solid ${border}`,
                    bgcolor: isSelected ? activeBg : isCurrentMonth ? panel : softPanel,
                    boxShadow: isToday && !isSelected ? `inset 0 0 0 2px ${accent}` : "none",
                    color: "inherit",
                    opacity: isCurrentMonth ? 1 : 0.55,
                    "&:hover": { bgcolor: hoverBg }
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ color: isSelected || isToday ? accent : ink, fontSize: 13, fontWeight: 760 }}>{day.date.getDate()}</Typography>
                    {dayProjects.length ? <Chip label={dayProjects.length} size="small" sx={{ height: 20, minWidth: 22, bgcolor: activeBg, color: accent, borderRadius: "5px", fontSize: 11 }} /> : null}
                  </Stack>
                  <Stack gap={0.5} sx={{ mt: 1 }}>
                    {dayProjects.slice(0, 1).map((project) => (
                      <Typography key={project.id} noWrap sx={{ px: 0.7, py: 0.35, borderRadius: "4px", bgcolor: statusBg(project.status), color: statusFg(project.status), fontSize: 11, fontWeight: 700 }}>
                        {project.title}
                      </Typography>
                    ))}
                    {dayProjects.length > 1 ? <Typography sx={{ color: muted, fontSize: 11 }}>+{dayProjects.length - 1} more</Typography> : null}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Paper>
        <Paper sx={{ ...panelSx, p: 2 }}>
          <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>{formatLongDate(selectedDate)}</Typography>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.5 }}>{selectedProjects.length} scheduled deliveries</Typography>
          <Stack gap={1.2} sx={{ mt: 2 }}>
            {selectedProjects.length ? selectedProjects.map((project) => (
              <Box key={project.id} sx={{ p: 1.4, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
                <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center">
                  <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{project.title}</Typography>
                  <StatusChip status={project.status} />
                </Stack>
                <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.5 }}>{project.client || project.workType}</Typography>
                <LinearProgress variant="determinate" value={projectProgress(project.status)} sx={{ mt: 1, height: 5, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
              </Box>
            )) : <EmptyPanel title="Nothing scheduled" body="Select a date with project deliveries or add a project due date." />}
          </Stack>
        </Paper>
      </Box>
    </PageFrame>
  );
}

function MediaDesignPage({ projects }: { projects: WorkItem[] }) {
  const active = projects.filter((project) => !isDoneStatus(project.status));
  const delivered = projects.filter((project) => isDoneStatus(project.status));
  const mediaGroups = [
    { label: "Project briefs", value: projects.length, helper: "One package per tracked project" },
    { label: "Active exports", value: active.length, helper: "Items still moving through edit or review" },
    { label: "Delivered archives", value: delivered.length, helper: "Completed work ready for handoff" }
  ];

  return (
    <PageFrame title="Media" subtitle="Organize project packages, exports, and handoff assets.">
      <MetricRail
        sx={{ mb: 3 }}
        items={mediaGroups.map((group, index) => ({
          label: group.label,
          value: String(group.value),
          helper: group.helper,
          icon: index === 0 ? <InsertDriveFileOutlinedIcon /> : index === 1 ? <CloudUploadOutlinedIcon /> : <HistoryOutlinedIcon />,
          tone: index === 1 ? "warning" as const : index === 2 ? "success" as const : "accent" as const
        }))}
      />
      <SplitWorkspace
        rail={
          <Box sx={{ p: 2 }}>
            <SectionEyebrow>Collections</SectionEyebrow>
            <Typography sx={{ color: ink, fontSize: 18, fontWeight: 720, mt: 0.65 }}>Library index</Typography>
            <Stack sx={{ mt: 1.5 }} divider={<Divider sx={{ borderColor: border }} />}>
              {mediaGroups.map((group, index) => (
                <Stack key={group.label} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.25 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Box sx={{ color: index === 1 ? warningColor : index === 2 ? successColor : accent, display: "grid", "& svg": { fontSize: 18 } }}>
                      {index === 0 ? <InsertDriveFileOutlinedIcon /> : index === 1 ? <CloudUploadOutlinedIcon /> : <HistoryOutlinedIcon />}
                    </Box>
                    <Typography sx={{ color: ink, fontSize: 13, fontWeight: 680 }}>{group.label}</Typography>
                  </Stack>
                  <Typography sx={{ color: muted, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{group.value}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        }
        detail={
          <Box>
            <Stack sx={{ px: 2.25, py: 2 }}>
              <Typography sx={{ color: ink, fontSize: 20, fontWeight: 720 }}>Project packages</Typography>
              <Typography sx={{ color: muted, fontSize: 12.5, mt: 0.45 }}>Briefs, active exports, and handoff archives generated from tracked work.</Typography>
            </Stack>
            <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
              {projects.length ? projects.slice(0, 10).map((project, index) => (
                <Box key={project.id} sx={{ display: "grid", gridTemplateColumns: { xs: "64px minmax(0, 1fr)", lg: "92px minmax(0, 1fr) 150px 160px 130px" }, gap: 2, alignItems: "center", px: 2.25, py: 1.6 }}>
              <Box sx={{ width: { xs: 54, lg: 78 }, height: { xs: 40, lg: 48 }, borderRadius: "6px", bgcolor: projectThumbColor(project.id || String(index)), border: `1px solid ${border}`, position: "relative", overflow: "hidden" }}>
                <Box sx={{ position: "absolute", left: 10, right: 10, bottom: 10, height: 3, borderRadius: 99, bgcolor: activeBg }} />
                <MovieCreationOutlinedIcon sx={{ position: "absolute", right: 9, top: 8, color: thumbIcon, fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{project.title}</Typography>
                <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{project.notes || "No media notes yet"}</Typography>
              </Box>
              <Typography sx={{ display: { xs: "none", lg: "block" }, color: muted, fontSize: 13 }}>{project.workType}</Typography>
              <Box sx={{ display: { xs: "none", lg: "block" } }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography sx={{ color: ink, fontSize: 12, fontWeight: 720 }}>Package progress</Typography>
                  <Typography sx={{ color: muted, fontSize: 12 }}>{projectProgress(project.status)}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={projectProgress(project.status)} sx={{ height: 5, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
              </Box>
              <StatusChip status={project.status} />
                </Box>
              )) : <EmptyPanel title="No media packages" body="Projects will appear here as package rows once added." />}
            </Stack>
          </Box>
        }
      />
    </PageFrame>
  );
}

function ResourcesDesignPage({ resources, projects, setResources, notify }: { resources: ResourceLink[]; projects: WorkItem[]; setResources: React.Dispatch<React.SetStateAction<ResourceLink[]>>; notify: (message: string, tone?: ToastState["tone"]) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ResourceLink>(() => emptyResourceForm());
  const [error, setError] = useState("");
  const sortedResources = [...resources].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  const linkedToProjects = resources.filter((resource) => resource.projectId).length;
  const projectOptions = ["General", ...projects.map((project) => project.id)];
  const projectLabels = Object.fromEntries(projects.map((project) => [project.id, project.title]));
  const projectSelectValue = form.projectId || "General";
  const safeProjectOptions = projectSelectValue && !projectOptions.includes(projectSelectValue)
    ? [projectSelectValue, ...projectOptions]
    : projectOptions;
  const safeProjectLabels = projectSelectValue && !projectLabels[projectSelectValue] && projectSelectValue !== "General"
    ? { ...projectLabels, [projectSelectValue]: "Deleted project" }
    : projectLabels;

  function emptyResourceForm(): ResourceLink {
    const now = new Date().toISOString();
    return {
      id: "",
      title: "",
      url: "",
      category: "Asset Folder",
      projectId: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
  }

  function openNewResource() {
    setEditingId("");
    setForm(emptyResourceForm());
    setError("");
    setDialogOpen(true);
  }

  function openEditResource(resource: ResourceLink) {
    setEditingId(resource.id);
    setForm(resource);
    setError("");
    setDialogOpen(true);
  }

  function saveResource() {
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) {
      setError("Resource title is required.");
      return;
    }
    if (!isValidIntegrationUrl(url)) {
      setError("Enter a valid http or https URL.");
      return;
    }

    const now = new Date().toISOString();
    const payload: ResourceLink = {
      ...form,
      id: editingId || createId(),
      title,
      url,
      category: form.category.trim() || "Other",
      projectId: form.projectId,
      notes: form.notes.trim(),
      createdAt: form.createdAt || now,
      updatedAt: now,
    };
    setResources((current) => (editingId ? current.map((resource) => (resource.id === editingId ? payload : resource)) : [payload, ...current]));
    setDialogOpen(false);
    setEditingId("");
    setForm(emptyResourceForm());
    notify(editingId ? "Resource updated." : "Resource added.");
  }

  function removeResource(id: string) {
    setResources((current) => current.filter((resource) => resource.id !== id));
    notify("Resource removed.", "warning");
  }

  function openResource(url: string) {
    if (typeof window === "undefined" || !isValidIntegrationUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function projectName(projectId: string) {
    return projects.find((project) => project.id === projectId)?.title ?? "";
  }

  return (
    <PageFrame
      title="Resources"
      subtitle="Store asset folders, reference links, review pages, and handoff resources."
      action={<Button variant="outlined" startIcon={<AddIcon />} onClick={openNewResource} sx={outlineButtonSx}>New Resource</Button>}
    >
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 4 }}><StatCard label="Resources" value={String(resources.length)} helper="Saved asset and reference links" /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><StatCard label="Project Linked" value={String(linkedToProjects)} helper="Attached to tracked projects" /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><StatCard label="Categories" value={String(new Set(resources.map((resource) => resource.category)).size)} helper="Resource groups in use" /></Grid>
      </Grid>

      <Paper sx={panelSx}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 2 }}>
          <Box>
            <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Resource Library</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 0.4 }}>Manual links for now; this can later map to cloud storage APIs or OAuth providers.</Typography>
          </Box>
          <Chip label={`${resources.length} saved`} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px" }} />
        </Stack>
        <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
          {sortedResources.length ? sortedResources.map((resource) => (
            <Box key={resource.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) 160px minmax(0, 1fr) 140px" }, gap: 2, px: 2, py: 1.5, alignItems: "center" }}>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" gap={0.8} alignItems="center" sx={{ mb: 0.4, flexWrap: "wrap" }}>
                  <Typography noWrap sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{resource.title}</Typography>
                  <Chip label={resource.category} size="small" sx={{ height: 21, bgcolor: softPanel, color: muted, borderRadius: "5px", fontSize: 11 }} />
                </Stack>
                <Typography noWrap sx={{ color: muted, fontSize: 12 }}>{resource.url}</Typography>
                {resource.notes ? <Typography sx={{ color: muted, fontSize: 12, mt: 0.45 }}>{resource.notes}</Typography> : null}
              </Box>
              <Typography sx={{ color: ink, fontSize: 13 }}>{resource.projectId ? projectName(resource.projectId) || "Linked project" : "General"}</Typography>
              <Typography noWrap sx={{ color: muted, fontSize: 12 }}>{formatDate((resource.updatedAt || resource.createdAt).slice(0, 10))}</Typography>
              <Stack direction="row" gap={0.6} justifyContent={{ xs: "flex-start", lg: "flex-end" }}>
                <Tooltip title="Open resource">
                  <Button aria-label={`Open ${resource.title}`} onClick={() => openResource(resource.url)} sx={{ minWidth: 34, width: 34, height: 34, color: accent, p: 0 }}>
                    <OpenInNewIcon sx={{ fontSize: 18 }} />
                  </Button>
                </Tooltip>
                <Tooltip title="Edit resource">
                  <Button aria-label={`Edit ${resource.title}`} onClick={() => openEditResource(resource)} sx={{ minWidth: 34, width: 34, height: 34, color: muted, p: 0 }}>
                    <EditOutlinedIcon sx={{ fontSize: 18 }} />
                  </Button>
                </Tooltip>
                <Tooltip title="Delete resource">
                  <Button aria-label={`Delete ${resource.title}`} onClick={() => removeResource(resource.id)} sx={{ minWidth: 34, width: 34, height: 34, color: dangerColor, p: 0 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </Button>
                </Tooltip>
              </Stack>
            </Box>
          )) : <EmptyPanel title="No resources yet" body="Add asset folders, reference docs, cloud links, review URLs, or handoff resources." />}
        </Stack>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
        <DialogTitle sx={{ fontSize: 24, fontWeight: 760 }}>{editingId ? "Edit Resource" : "New Resource"}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField label="Resource title" value={form.title} onChange={(event) => { setForm({ ...form, title: event.target.value }); setError(""); }} fullWidth />
            <TextField label="URL" value={form.url} placeholder="https://..." error={Boolean(error && !isValidIntegrationUrl(form.url))} onChange={(event) => { setForm({ ...form, url: event.target.value }); setError(""); }} fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <DialogSelect label="Category" value={form.category} options={resourceCategories} onChange={(value) => setForm({ ...form, category: value })} />
              <DialogSelect label="Project" value={projectSelectValue} options={safeProjectOptions} labels={safeProjectLabels} onChange={(value) => setForm({ ...form, projectId: value === "General" ? "" : value })} />
            </Stack>
            <TextField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} fullWidth multiline minRows={3} />
            {error ? <Typography sx={{ color: dangerColor, fontSize: 13 }}>{error}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: muted }}>Cancel</Button>
          <Button onClick={saveResource} variant="contained" sx={{ bgcolor: accent, color: "#fff", "&:hover": { bgcolor: accent } }}>Save Resource</Button>
        </DialogActions>
      </Dialog>
    </PageFrame>
  );
}

function FeedbackDesignPage({ projects }: { projects: WorkItem[] }) {
  const settings = useTrackerSettings();
  const feedbackItems = projects.filter((project) => project.status === "In Progress" || project.status === "Planned").slice(0, 8);

  return (
    <PageFrame title="Feedback" subtitle="Track review notes, revisions, and approval states.">
      {!projects.length ? (
        <Paper sx={panelSx}>
          <Box sx={{ px: 2, pt: 2 }}>
            <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Review Queue</Typography>
          </Box>
          <EmptyPanel
            title="No feedback items"
            body="Feedback and revision activity will appear here after you create a project and move it into review."
            assetKey="feedback"
          />
        </Paper>
      ) : (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 360px" }, gap: 2 }}>
        <Paper sx={panelSx}>
          <Stack sx={{ px: 2, py: 2 }}>
            <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Review Queue</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 0.5 }}>Active and planned projects that may need review attention.</Typography>
          </Stack>
          <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
            {feedbackItems.length ? feedbackItems.map((project) => (
              <Box key={project.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 160px 140px" }, gap: 2, px: 2, py: 1.6, alignItems: "center" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ color: ink, fontSize: 15, fontWeight: 760 }}>{project.title}</Typography>
                  <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{project.client || project.notes || project.workType}</Typography>
                </Box>
                <Typography sx={{ color: muted, fontSize: 13 }}>{formatDate(project.dueDate, settings.dateFormat)}</Typography>
                <StatusChip status={project.status} />
              </Box>
            )) : <EmptyPanel title="No active feedback" body="In-progress and planned projects will appear here." />}
          </Stack>
        </Paper>
        <Paper sx={{ ...panelSx, p: 2 }}>
          <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Revision Summary</Typography>
          <Grid container spacing={1} sx={{ mt: 2 }}>
            <Grid size={6}><MiniMetric label="Awaiting" value={String(feedbackItems.length)} /></Grid>
            <Grid size={6}><MiniMetric label="Delivered" value={String(projects.filter((project) => isDoneStatus(project.status)).length)} /></Grid>
          </Grid>
          <Typography sx={{ color: muted, fontSize: 13, mt: 2 }}>Project notes serve as the review log for client comments and revision context.</Typography>
        </Paper>
      </Box>
      )}
    </PageFrame>
  );
}

type TemplateFormState = {
  id: string;
  name: string;
  description: string;
  projectType: string;
  workType: "channel" | "freelance";
  durationDays: number;
  workflowStagesText: string;
  deliverablesText: string;
  checklistText: string;
};

const emptyTemplateForm: TemplateFormState = {
  id: "",
  name: "",
  description: "",
  projectType: "",
  workType: "freelance",
  durationDays: 7,
  workflowStagesText: "Brief\nEdit\nReview\nDelivery",
  deliverablesText: "Final master",
  checklistText: "Confirm brief\nCheck export settings",
};

function templateToForm(template: ProjectTemplate): TemplateFormState {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    projectType: template.projectType,
    workType: template.workType,
    durationDays: template.durationDays,
    workflowStagesText: template.workflowStages.join("\n"),
    deliverablesText: template.deliverables.map((item) => item.title).join("\n"),
    checklistText: template.checklistItems.join("\n"),
  };
}

function linesFromText(value: string, limit: number) {
  return value.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean).slice(0, limit);
}

function customTemplateFromForm(form: TemplateFormState): SavedProjectTemplate {
  const name = form.name.trim().slice(0, 80) || "Custom template";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "template";
  const id = form.id || `custom-${slug}-${Date.now().toString(36)}`;
  const deliverableTitles = linesFromText(form.deliverablesText, 12);
  return {
    id,
    name,
    description: form.description.trim().slice(0, 220) || "Reusable workflow for recurring client work.",
    projectType: form.projectType.trim().slice(0, 80) || "Custom project",
    workType: form.workType,
    durationDays: Math.max(1, Math.min(120, Math.floor(Number(form.durationDays) || 7))),
    workflowStages: linesFromText(form.workflowStagesText, 12),
    deliverables: (deliverableTitles.length ? deliverableTitles : ["Final master"]).map((title) => ({
      title: title.slice(0, 120),
      category: "Deliverable" as FileCategory,
      initialStatus: "draft" as FileStatus,
    })),
    checklistItems: linesFromText(form.checklistText, 20),
    custom: true,
    updatedAt: new Date().toISOString(),
  };
}

function TemplatesDesignPage({
  onUseBlank,
  onUseTemplate,
}: {
  onUseBlank: () => void;
  onUseTemplate: (template: ProjectTemplate) => void;
}) {
  const { settings, setSettings } = useData();
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm);
  const [builderOpen, setBuilderOpen] = useState(false);
  const customTemplates = settings.customProjectTemplates ?? [];
  const templates = useMemo(() => [...PROJECT_TEMPLATES, ...customTemplates], [customTemplates]);

  function openBuilder(template?: ProjectTemplate) {
    setTemplateForm(template ? templateToForm(template) : { ...emptyTemplateForm, id: "" });
    setBuilderOpen(true);
  }

  function saveTemplate() {
    const nextTemplate = customTemplateFromForm(templateForm);
    setSettings((current) => {
      const currentTemplates = current.customProjectTemplates ?? [];
      const exists = currentTemplates.some((template) => template.id === nextTemplate.id);
      return {
        ...current,
        customProjectTemplates: exists
          ? currentTemplates.map((template) => template.id === nextTemplate.id ? nextTemplate : template)
          : [nextTemplate, ...currentTemplates].slice(0, 24),
      };
    });
    setBuilderOpen(false);
  }

  function deleteTemplate(templateId: string) {
    setSettings((current) => ({
      ...current,
      customProjectTemplates: (current.customProjectTemplates ?? []).filter((template) => template.id !== templateId),
    }));
  }

  return (
    <PageFrame
      title="Templates"
      subtitle="Start with a practical editing workflow, or save your own recurring setup for the next project."
      action={
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openBuilder()} sx={outlineButtonSx}>Custom Template</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onUseBlank} sx={outlineButtonSx}>Blank Project</Button>
        </Stack>
      }
    >
      <Grid container spacing={settings.density === "Compact" ? 0.8 : 1.1}>
        {templates.map((template) => (
          <Grid key={template.id} size={{ xs: 12, md: 6, xl: 4 }}>
            <Box component="article" sx={{ borderTop: `1px solid ${border}`, py: { xs: 1.45, md: 1.7 }, pr: { md: 2 }, minHeight: 210, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                  <Box>
                    <Stack direction="row" alignItems="center" gap={0.8} flexWrap="wrap">
                      <Typography sx={{ color: ink, fontSize: 17, fontWeight: 740 }}>{template.name}</Typography>
                      {template.custom ? <Chip label="Custom" size="small" sx={{ height: 20, borderRadius: "5px", bgcolor: activeBg, color: accent, fontSize: 10.5, fontWeight: 760 }} /> : null}
                    </Stack>
                    <Typography sx={{ color: muted, fontSize: 12.5, mt: 0.55, lineHeight: 1.45, maxWidth: 500 }}>{template.description}</Typography>
                  </Box>
                  <Box sx={{ color: accent, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 22 }} />
                  </Box>
                </Stack>
                <Stack direction="row" gap={1.1} flexWrap="wrap" sx={{ mt: 1.15 }}>
                  <Typography sx={{ color: accent, fontSize: 12, fontWeight: 700 }}>{template.projectType}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12 }}>{template.durationDays} days</Typography>
                </Stack>
                <Typography sx={{ color: muted, fontSize: 11.5, fontWeight: 700, mt: 1.25 }}>Workflow</Typography>
                <Typography sx={{ color: ink, fontSize: 12.5, lineHeight: 1.45, mt: 0.35 }}>{template.workflowStages.join(" -> ") || "Add stages after creating the project"}</Typography>
                <Typography sx={{ color: muted, fontSize: 11.5, mt: 0.75 }}>{template.deliverables.length} deliverables · {template.checklistItems.length} checklist items</Typography>
              </Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mt: 1.4 }}>
                <Button onClick={() => onUseTemplate(template)} sx={{ px: 0, width: "fit-content", color: accent, justifyContent: "flex-start", gap: 0.5, fontSize: 12.5, fontWeight: 720 }}>
                  Use template
                  <AddIcon sx={{ color: accent, fontSize: 17 }} />
                </Button>
                {template.custom ? (
                  <Stack direction="row" gap={0.5}>
                    <Button size="small" onClick={() => openBuilder(template)} sx={{ minWidth: 0, color: muted, px: 0.8 }}>Edit</Button>
                    <Button size="small" onClick={() => deleteTemplate(template.id)} sx={{ minWidth: 0, color: dangerColor, px: 0.8 }}>Delete</Button>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Dialog open={builderOpen} onClose={() => setBuilderOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 760 }}>{templateForm.id ? "Edit Custom Template" : "New Custom Template"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.4} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, md: 6 }}><TextField label="Template name" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} fullWidth /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField label="Project type" value={templateForm.projectType} onChange={(event) => setTemplateForm({ ...templateForm, projectType: event.target.value })} fullWidth /></Grid>
            <Grid size={{ xs: 12 }}><TextField label="Description" value={templateForm.description} onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })} fullWidth /></Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Work type</InputLabel>
                <Select label="Work type" value={templateForm.workType} onChange={(event) => setTemplateForm({ ...templateForm, workType: event.target.value as "channel" | "freelance" })}>
                  <MenuItem value="freelance">Freelance</MenuItem>
                  <MenuItem value="channel">Channel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField label="Duration days" type="number" value={templateForm.durationDays} onChange={(event) => setTemplateForm({ ...templateForm, durationDays: Number(event.target.value) })} fullWidth /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField label="Workflow stages" value={templateForm.workflowStagesText} onChange={(event) => setTemplateForm({ ...templateForm, workflowStagesText: event.target.value })} multiline minRows={5} fullWidth helperText="One per line" /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField label="Deliverables" value={templateForm.deliverablesText} onChange={(event) => setTemplateForm({ ...templateForm, deliverablesText: event.target.value })} multiline minRows={5} fullWidth helperText="One per line" /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField label="Checklist" value={templateForm.checklistText} onChange={(event) => setTemplateForm({ ...templateForm, checklistText: event.target.value })} multiline minRows={5} fullWidth helperText="One per line" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuilderOpen(false)} sx={{ color: muted }}>Cancel</Button>
          <Button variant="contained" onClick={saveTemplate} disabled={!templateForm.name.trim()} sx={{ bgcolor: accent, "&:hover": { bgcolor: accent } }}>Save Template</Button>
        </DialogActions>
      </Dialog>
    </PageFrame>
  );
}
function ReportsDesignPage({
  projects,
  salaryBatches,
  editors,
  onUpdateBatchPayment,
}: {
  projects: WorkItem[];
  salaryBatches: SalaryBatch[];
  editors: PayoutEditor[];
  onUpdateBatchPayment: (batchId: string, paid: boolean) => void;
}) {
  const settings = useTrackerSettings();
  const [period, setPeriod] = useState<PayoutPeriod>("year");
  const report = useMemo(() => buildPayoutReport({
    projects,
    salaryBatches,
    salaryWorkType: settings.salaryWorkType,
    salaryBatchAmount: settings.salaryBatchAmount,
    profileName: settings.profileName,
    editors,
    period,
  }), [editors, period, projects, salaryBatches, settings.profileName, settings.salaryBatchAmount, settings.salaryWorkType]);
  const workTypeOptions = projectWorkTypeOptions(settings, projects);
  const workMixData = workTypeOptions
    .map((kind) => ({
      id: kind,
      label: kind,
      value: projects.filter((project) => project.workType.trim().toLowerCase() === kind.toLowerCase()).length,
    }))
    .filter((item) => item.value > 0);
  const periodLabel = period === "all" ? "All time" : period === "year" ? "This year" : period === "quarter" ? "This quarter" : "This month";

  function exportCsv() {
    const csv = payoutReportToCsv(report, settings.currencyCode);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cutlab-payout-report-${period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageFrame
      title="Reports"
      subtitle="Track completed salary batches, delivered work, and editor payouts without turning the tracker into accounting software."
      action={
        <Stack direction="row" gap={1}>
          <FormControl size="small" sx={{ minWidth: 145 }}>
            <Select
              value={period}
              inputProps={{ "aria-label": "Payout period" }}
              onChange={(event) => setPeriod(event.target.value as PayoutPeriod)}
            >
              <MenuItem value="month">This month</MenuItem>
              <MenuItem value="quarter">This quarter</MenuItem>
              <MenuItem value="year">This year</MenuItem>
              <MenuItem value="all">All time</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={exportCsv} sx={outlineButtonSx}>
            Export CSV
          </Button>
        </Stack>
      }
    >
      <MetricRail
        sx={{ mb: 3 }}
        items={[
          { label: "Completed batches", value: String(report.completedBatchCount), helper: periodLabel, icon: <CheckCircleOutlineIcon />, tone: "success" },
          { label: "Paid batches", value: money(report.paidBatchEarnings, settings.currencyCode), helper: `${report.paidBatchCount} marked paid`, icon: <FileDownloadOutlinedIcon />, tone: "accent" },
          { label: "Outstanding", value: money(report.unpaidBatchEarnings, settings.currencyCode), helper: `${report.unpaidBatchCount} unpaid batches`, icon: <AccessTimeOutlinedIcon />, tone: "warning" },
          { label: "Period earnings", value: money(report.totalEarnings, settings.currencyCode), helper: "Projects plus payouts", icon: <InsertChartOutlinedIcon /> }
        ]}
      />

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ ...panelSx, overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${border}` }}>
              <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Salary Batch Ledger</Typography>
              <Typography sx={{ color: muted, fontSize: 13, mt: 0.4 }}>
                Payout amounts are captured when a batch completes. Older batches use the current setting until saved again.
              </Typography>
            </Box>
            {report.batches.length ? report.batches.map((batch) => (
              <Box
                key={batch.id}
                sx={{
                  px: 2,
                  py: 1.4,
                  borderBottom: `1px solid ${border}`,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr auto", md: "1.2fr 1fr 1fr auto" },
                  gap: 1.5,
                  alignItems: "center",
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                <Box>
                  <Typography sx={{ color: ink, fontSize: 14, fontWeight: 740 }}>Batch {batch.number}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12 }}>{batch.editorName}</Typography>
                </Box>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Typography sx={tableHeadingSx}>Completed</Typography>
                  <Typography sx={{ color: ink, fontSize: 13 }}>{formatDate(batch.date, settings.dateFormat)}</Typography>
                </Box>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Typography sx={tableHeadingSx}>Payout</Typography>
                  <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{money(batch.amount, settings.currencyCode)}</Typography>
                </Box>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ color: batch.paid ? successColor : warningColor, fontSize: 12, fontWeight: 720 }}>
                      {batch.paid ? "Paid" : "Unpaid"}
                    </Typography>
                    {batch.paidDate ? (
                      <Typography sx={{ color: muted, fontSize: 10 }}>{formatDate(batch.paidDate, settings.dateFormat)}</Typography>
                    ) : null}
                  </Box>
                  <Switch
                    size="small"
                    checked={batch.paid}
                    onChange={(event) => onUpdateBatchPayment(batch.id, event.target.checked)}
                    inputProps={{ "aria-label": `Mark batch ${batch.number} paid` }}
                  />
                </Stack>
              </Box>
            )) : (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ color: ink, fontWeight: 720 }}>No completed batches in this period</Typography>
                <Typography sx={{ color: muted, fontSize: 13, mt: 0.5 }}>
                  A batch appears after {normalizedSalaryBatchSize(settings.salaryBatchSize)} delivered salary edits.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ ...panelSx, p: 2, height: "100%" }}>
            <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Editor Summary</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 0.4, mb: 1.5 }}>
              Team work is attributed to the first assignee, then the project owner.
            </Typography>
            <Stack divider={<Divider sx={{ borderColor: border }} />}>
              {report.editors.length ? report.editors.map((editor) => (
                <Box key={editor.id} sx={{ py: 1.2 }}>
                  <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography sx={{ color: ink, fontSize: 14, fontWeight: 740 }}>{editor.name}</Typography>
                    <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{money(editor.totalEarnings, settings.currencyCode)}</Typography>
                  </Stack>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.4 }}>
                    {editor.deliveredProjects} delivered · {editor.salaryEdits} salary edits
                  </Typography>
                </Box>
              )) : <Typography sx={{ color: muted, fontSize: 13 }}>No delivered work in this period.</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ ...panelSx, overflow: "hidden", mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${border}` }}>
          <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Delivered Projects</Typography>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.4 }}>
            Project earnings use the delivery due date; salary edits are paid through completed batches.
          </Typography>
        </Box>
        {report.deliveredProjects.length ? report.deliveredProjects.map((project) => (
          <Box
            key={project.id}
            sx={{
              px: 2,
              py: 1.35,
              display: "grid",
              gridTemplateColumns: { xs: "1fr auto", md: "minmax(220px, 1.8fr) 1fr 1fr 1fr" },
              gap: 1.5,
              borderBottom: `1px solid ${border}`,
              alignItems: "center",
              "&:last-child": { borderBottom: 0 },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ color: ink, fontSize: 14, fontWeight: 740 }}>{project.title}</Typography>
              <Typography sx={{ color: muted, fontSize: 12 }}>{project.workType}</Typography>
            </Box>
            <Typography sx={{ color: ink, fontSize: 13 }}>{project.editorName}</Typography>
            <Typography sx={{ color: muted, fontSize: 13, display: { xs: "none", md: "block" } }}>{formatDate(project.date, settings.dateFormat)}</Typography>
            <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720, textAlign: { md: "right" } }}>
              {project.isSalaryEdit ? "Batch tracked" : money(project.amount, settings.currencyCode)}
            </Typography>
          </Box>
        )) : (
          <Box sx={{ p: 3 }}>
            <Typography sx={{ color: muted, fontSize: 13 }}>No delivered projects in this period.</Typography>
          </Box>
        )}
      </Paper>

      <SectionModule
        title="Work mix"
        description="Distribution of tracked work types in the selected reporting period."
        aside={workMixData.length ? <WorkMixChart data={workMixData} /> : <Typography sx={{ color: muted, fontSize: 13 }}>No work mix available.</Typography>}
      >
        <Stack gap={1.25}>
          {workTypeOptions.map((kind) => {
            const count = projects.filter((project) => project.workType.trim().toLowerCase() === kind.toLowerCase()).length;
            const percent = projects.length ? (count / projects.length) * 100 : 0;
            return (
              <Box key={kind}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                  <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{kind}</Typography>
                  <Typography sx={{ color: muted, fontSize: 13 }}>{count}</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={percent} sx={{ height: 7, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
              </Box>
            );
          })}
        </Stack>
      </SectionModule>
    </PageFrame>
  );
}

function TeamDesignPage({ projects, settings }: { projects: WorkItem[]; settings: SettingsState; setSettings: (settings: SettingsState) => void }) {
  const { isSignedIn, isLoaded: isUserLoaded, openSignIn, openSignUp } = useAppAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const teamData = useQuery(api.team.getMyWorkspace, isConvexAuthenticated ? {} : "skip");
  const createWorkspace = useMutation(api.team.createWorkspace);
  const joinWorkspace = useMutation(api.team.joinWorkspace);
  const inviteMember = useMutation(api.team.inviteMember);
  const updateMemberRole = useMutation(api.team.updateMemberRole);
  const normalizeLegacyRoles = useMutation(api.team.normalizeLegacyRoles);
  const removeMember = useMutation(api.team.removeMember);
  const leaveWorkspace = useMutation(api.team.leaveWorkspace);
  const addProjectComment = useMutation(api.team.addProjectComment);
  const markNotificationRead = useMutation(api.team.markNotificationRead);
  const markAllNotificationsRead = useMutation(api.team.markAllNotificationsRead);
  const [workspaceName, setWorkspaceName] = useState(settings.studioName || "CutLab Studio Team");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", role: "Editor" });
  const [commentBody, setCommentBody] = useState("");
  const [commentTimecode, setCommentTimecode] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [inviteCopyLabel, setInviteCopyLabel] = useState("Copy Invite Code");
  const [busyAction, setBusyAction] = useState("");
  const teamId = teamData?.workspace?._id;
  const teamProjects = useMemo(() => (teamId ? projects.filter((project) => project.teamId === teamId) : []), [projects, teamId]);
  const teamProjectTitles = useMemo(() => Object.fromEntries(teamProjects.map((project) => [project.id, project.title])), [teamProjects]);
  const clients = buildClientSummaries(teamProjects, settings.customClients);
  const selectedProject = teamProjects.find((project) => project.id === selectedProjectId) ?? teamProjects[0] ?? null;
  const projectComments = useQuery(
    api.team.listProjectComments,
    isConvexAuthenticated && teamId && selectedProject ? { teamId, projectId: selectedProject.id } : "skip"
  );
  const activeMembers = teamData?.members.filter((member) => member.status === "active") ?? [];
  const pendingInvites = teamData?.members.filter((member) => member.status === "invited") ?? [];
  const unreadNotifications = teamData?.notifications.filter((notification) => !notification.read).length ?? 0;
  const canManageTeam = Boolean(teamData?.currentMember.permissions.manageTeam);
  const canCommentProjects = Boolean(teamData?.currentMember.permissions.commentProjects);
  const canLeaveWorkspace = Boolean(teamData && teamData.currentMember.role !== "Owner");
  const inviteCodeIsValid = TEAM_INVITE_CODE_PATTERN.test(inviteCode.trim());
  const inviteEmailIsValid = isValidEmail(inviteForm.email);

  useEffect(() => {
    if (!teamProjects.length) {
      if (selectedProjectId) setSelectedProjectId("");
      return;
    }
    if (!teamProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(teamProjects[0].id);
    }
  }, [selectedProjectId, teamProjects]);

  useEffect(() => {
    if (!teamData?.workspace || !canManageTeam || !teamData.members.some((member) => member.role === "Client")) return;
    void normalizeLegacyRoles({ teamId: teamData.workspace._id }).catch((error) => {
      setTeamError(error instanceof Error ? error.message : "Legacy team roles could not be updated.");
    });
  }, [canManageTeam, normalizeLegacyRoles, teamData]);

  async function runTeamAction(label: string, action: () => Promise<unknown>) {
    setBusyAction(label);
    setTeamError("");
    try {
      await action();
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Team action failed.");
    } finally {
      setBusyAction("");
    }
  }

  function formatActivityTime(value: string) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  }

  async function copyInviteCode(code: string) {
    const copied = await copyText(code);
    setInviteCopyLabel(copied ? "Copied" : "Copy Failed");
    window.setTimeout(() => setInviteCopyLabel("Copy Invite Code"), 1800);
  }

  function teamProjectLabel(projectId?: string) {
    if (!projectId) return "";
    return teamProjectTitles[projectId] ?? "Deleted team project";
  }

  function showTeamProject(projectId?: string) {
    if (!projectId || !teamProjectTitles[projectId]) return;
    setSelectedProjectId(projectId);
  }

  return (
    <PageFrame
      title="Team"
      subtitle="Manage members, shared project comments, notifications, and workspace activity."
    >
      <MetricRail
        sx={{ mb: 3 }}
        items={[
          { label: "Active members", value: String(activeMembers.length), helper: `${pendingInvites.length} pending invite${pendingInvites.length === 1 ? "" : "s"}`, icon: <PeopleAltOutlinedIcon />, tone: "accent" },
          { label: "Team projects", value: String(teamProjects.length), helper: "Shared production work", icon: <FolderOpenOutlinedIcon /> },
          { label: "Client contacts", value: String(clients.length), helper: "From shared projects", icon: <PersonOutlineOutlinedIcon /> },
          { label: "Unread updates", value: String(unreadNotifications), helper: "Mentions and activity", icon: <NotificationsNoneOutlinedIcon />, tone: unreadNotifications ? "warning" : "default" }
        ]}
      />

      {teamError ? <Paper sx={{ ...panelSx, p: 1.5, mb: 1.5, borderColor: dangerColor, bgcolor: "var(--app-danger-bg)" }}><Typography sx={{ color: dangerColor, fontSize: 13, fontWeight: 700 }}>{teamError}</Typography></Paper> : null}

      {!isUserLoaded ? (
        <Paper sx={{ ...panelSx, p: 3 }}><Stack direction="row" gap={1.2} alignItems="center"><CircularProgress size={18} /><Typography sx={{ color: muted, fontSize: 14 }}>Checking account status...</Typography></Stack></Paper>
      ) : !isSignedIn ? (
        <Paper sx={{ ...panelSx, p: { xs: 2.25, md: 3 } }}>
          <Box sx={{ maxWidth: 720 }}>
            <Typography sx={{ color: ink, fontSize: { xs: 24, md: 30 }, fontWeight: 780, lineHeight: 1.1 }}>Team workspaces require an account</Typography>
            <Typography sx={{ color: muted, fontSize: 14, mt: 1 }}>
              Local mode is available for solo tracking, but invites, shared projects, comments, notifications, activity, and chat need Clerk sign-in so Convex can sync the right team workspace.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => openSignUp()} sx={{ bgcolor: accent, "&:hover": { bgcolor: accent } }}>Create Account</Button>
              <Button variant="outlined" onClick={() => openSignIn()} sx={outlineButtonSx}>Sign In</Button>
            </Stack>
          </Box>
        </Paper>
      ) : isConvexAuthLoading ? (
        <Paper sx={{ ...panelSx, p: 3 }}><Stack direction="row" gap={1.2} alignItems="center"><CircularProgress size={18} /><Typography sx={{ color: muted, fontSize: 14 }}>Connecting your account to Team sync...</Typography></Stack></Paper>
      ) : !isConvexAuthenticated ? (
        <Paper sx={{ ...panelSx, p: { xs: 2.25, md: 3 }, borderColor: dangerColor, bgcolor: "var(--app-danger-bg)" }}>
          <Typography sx={{ color: dangerColor, fontSize: 20, fontWeight: 780 }}>Team sync is not connected</Typography>
          <Typography sx={{ color: dangerColor, fontSize: 13, mt: 0.8, lineHeight: 1.55 }}>
            Clerk sign-in is loaded, but Convex did not receive an authenticated token. Check `convex/auth.config.ts`, the Clerk JWT template audience, and the Clerk issuer environment variables before running the two-account Team smoke test.
          </Typography>
        </Paper>
      ) : teamData === undefined ? (
        <Paper sx={{ ...panelSx, p: 3 }}><Stack direction="row" gap={1.2} alignItems="center"><CircularProgress size={18} /><Typography sx={{ color: muted, fontSize: 14 }}>Loading team workspace...</Typography></Stack></Paper>
      ) : !teamData ? (
        <Grid container spacing={1.5}>
          <Grid size={12}>
            <Paper sx={panelSx}>
              <EmptyPanel
                title="Invite your team"
                body="Create a shared workspace or join one with an invite code to start collaborating."
                assetKey="team"
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ ...panelSx, p: 2.25, height: "100%" }}>
              <Typography sx={{ color: ink, fontSize: 22, fontWeight: 780 }}>Create a workspace</Typography>
              <Typography sx={{ color: muted, fontSize: 13, mt: 0.6 }}>Owners can invite up to four more members. Projects, comments, notifications, activity, and chat sync through Convex.</Typography>
              <TextField
                label="Workspace name"
                value={workspaceName}
                size="small"
                fullWidth
                sx={{ mt: 2 }}
                slotProps={{ htmlInput: { maxLength: TEAM_WORKSPACE_NAME_LIMIT } }}
                helperText={`${workspaceName.length}/${TEAM_WORKSPACE_NAME_LIMIT} characters`}
                onChange={(event) => setWorkspaceName(event.target.value)}
              />
              <Button variant="contained" sx={{ mt: 1.4, bgcolor: accent, "&:hover": { bgcolor: accent } }} disabled={Boolean(busyAction)} onClick={() => runTeamAction("create", () => createWorkspace({ name: workspaceName }))}>Create Team Workspace</Button>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ ...panelSx, p: 2.25, height: "100%" }}>
              <Typography sx={{ color: ink, fontSize: 22, fontWeight: 780 }}>Join with an invite code</Typography>
              <Typography sx={{ color: muted, fontSize: 13, mt: 0.6 }}>Use the six-character code from your team owner. Your signed-in email must match a pending invite.</Typography>
              <TextField
                label="Invite code"
                value={inviteCode}
                size="small"
                fullWidth
                sx={{ mt: 2 }}
                slotProps={{ htmlInput: { maxLength: 6 } }}
                error={Boolean(inviteCode.trim() && !inviteCodeIsValid)}
                helperText="Enter the six-character code from your team owner."
                onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
              <Button variant="outlined" sx={{ ...outlineButtonSx, mt: 1.4 }} disabled={Boolean(busyAction) || !inviteCodeIsValid} onClick={() => runTeamAction("join", () => joinWorkspace({ inviteCode }))}>Join Workspace</Button>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Stack gap={1.5}>
              <Paper sx={panelSx}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.4} sx={{ p: 2 }}>
                  <Box>
                    <Typography sx={{ color: ink, fontSize: 22, fontWeight: 780 }}>{teamData.workspace.name}</Typography>
                    {canManageTeam ? (
                      <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mt: 0.65 }}>
                        <Typography sx={{ color: muted, fontSize: 13 }}>Invite code <Box component="span" sx={{ color: accent, fontWeight: 800, letterSpacing: 1 }}>{teamData.workspace.inviteCode}</Box></Typography>
                        <Button size="small" variant="outlined" onClick={() => copyInviteCode(teamData.workspace.inviteCode)} sx={{ ...outlineButtonSx, height: 30, px: 1.1, fontSize: 11 }}>{inviteCopyLabel}</Button>
                      </Stack>
                    ) : (
                      <Typography sx={{ color: muted, fontSize: 13, mt: 0.45 }}>Invite code is visible to team owners only.</Typography>
                    )}
                  </Box>
                  <Stack direction="row" gap={0.8} alignItems="center" flexWrap="wrap" sx={{ alignSelf: { xs: "flex-start", md: "center" }, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                    <Chip label={`${teamData.currentMember.role} access`} sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px", fontWeight: 760 }} />
                    {canLeaveWorkspace ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={Boolean(busyAction)}
                        onClick={() => runTeamAction("leave", () => leaveWorkspace({ teamId: teamData.workspace._id }))}
                        sx={{ ...outlineButtonSx, height: 32, color: dangerColor, borderColor: dangerColor, fontSize: 11 }}
                      >
                        Leave Workspace
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
                <Divider sx={{ borderColor: border }} />
                <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
                  {teamData.members.map((member) => (
                    <Stack key={member._id} direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1} sx={{ p: 1.5 }}>
                      <Box>
                        <Stack direction="row" gap={0.8} alignItems="center" flexWrap="wrap">
                          <Typography sx={{ color: ink, fontSize: 14, fontWeight: 780 }}>{member.name}</Typography>
                          <Chip label={member.role} size="small" sx={{ height: 20, fontSize: 10, bgcolor: softPanel, color: muted, borderRadius: "4px" }} />
                          <Chip label={member.status} size="small" sx={{ height: 20, fontSize: 10, bgcolor: member.status === "active" ? activeBg : "#fff3d8", color: member.status === "active" ? accent : "#996b08", borderRadius: "4px" }} />
                        </Stack>
                        <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{member.email || "No email on profile"}</Typography>
                      </Box>
                      <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ justifyContent: { xs: "flex-start", md: "flex-end" }, alignItems: "center" }}>
                        {canManageTeam && member.role !== "Owner" ? (
                          <Box sx={{ width: { xs: "100%", sm: 150 } }}>
                            <DialogSelect
                              label="Role"
                              value={member.role}
                              options={teamRoleOptions.filter((role) => role !== "Owner")}
                              onChange={(role) => runTeamAction("role", () => updateMemberRole({ teamId: teamData.workspace._id, memberId: member._id, role: role as "Editor" | "Reviewer" }))}
                            />
                          </Box>
                        ) : Object.entries(member.permissions).filter(([, enabled]) => enabled).slice(0, 4).map(([permission]) => (
                          <Chip key={permission} label={permission} size="small" sx={{ height: 21, fontSize: 10, bgcolor: softPanel, color: muted, borderRadius: "4px" }} />
                        ))}
                        {canManageTeam && member.role !== "Owner" ? (
                          <Button
                            size="small"
                            disabled={Boolean(busyAction)}
                            onClick={() => runTeamAction("remove", () => removeMember({ teamId: teamData.workspace._id, memberId: member._id }))}
                            sx={{ color: dangerColor, fontSize: 12, fontWeight: 760 }}
                          >
                            {member.status === "invited" ? "Cancel Invite" : "Remove"}
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
                {canManageTeam ? (
                  <Box sx={{ p: 2, borderTop: `1px solid ${border}` }}>
                    <Typography sx={{ color: ink, fontSize: 15, fontWeight: 760 }}>Invite member</Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 150px 120px" }, gap: 1, mt: 1 }}>
                      <TextField label="Email" value={inviteForm.email} size="small" error={Boolean(inviteForm.email.trim() && !isValidEmail(inviteForm.email))} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} />
                      <DialogSelect label="Role" value={inviteForm.role} options={teamRoleOptions.filter((role) => role !== "Owner")} onChange={(value) => setInviteForm({ ...inviteForm, role: value })} />
                      <Button variant="outlined" sx={outlineButtonSx} disabled={Boolean(busyAction) || !inviteEmailIsValid} onClick={() => runTeamAction("invite", async () => { await inviteMember({ teamId: teamData.workspace._id, email: inviteForm.email, role: inviteForm.role as "Editor" | "Reviewer" }); setInviteForm({ email: "", role: "Editor" }); })}>Invite</Button>
                    </Box>
                  </Box>
                ) : null}
              </Paper>

              <Paper sx={{ ...panelSx, p: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1} sx={{ mb: 1.4 }}>
                  <Box>
                    <Typography sx={{ color: ink, fontSize: 20, fontWeight: 780 }}>Project Comments</Typography>
                    <Typography sx={{ color: muted, fontSize: 13 }}>Leave notes for the team. Use @name or @emailname to notify someone.</Typography>
                  </Box>
                  <DialogSelect label="Project" value={selectedProject?.id ?? ""} options={teamProjects.map((project) => project.id)} labels={Object.fromEntries(teamProjects.map((project) => [project.id, project.title]))} onChange={setSelectedProjectId} />
                </Stack>
                {selectedProject ? (
                  <Stack gap={1.2}>
                    <Box sx={{ p: 1.2, bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "6px" }}>
                      <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{selectedProject.title}</Typography>
                      <Typography sx={{ color: muted, fontSize: 12, mt: 0.25 }}>{selectedProject.client || "No client"} · {selectedProject.status} · Due {formatDate(selectedProject.dueDate, settings.dateFormat)}</Typography>
                    </Box>
                    <Stack gap={1} sx={{ maxHeight: 270, overflow: "auto" }}>
                      {projectComments === undefined ? <Typography sx={{ color: muted, fontSize: 13 }}>Loading comments...</Typography> : projectComments.length ? projectComments.map((comment) => (
                        <Box key={comment._id} sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
                          <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{comment.authorName} <Box component="span" sx={{ color: muted, fontSize: 11, fontWeight: 500 }}>{formatActivityTime(comment.createdAt)}</Box></Typography>
                          <TimecodeChip value={comment.timecode} />
                          <Typography sx={{ color: ink, fontSize: 13, mt: 0.5, whiteSpace: "pre-wrap" }}>{comment.body}</Typography>
                        </Box>
                      )) : <EmptyPanel title="No project comments yet" body="Team notes for this project will appear here in real time." />}
                    </Stack>
                    {canCommentProjects ? (
                      <Stack direction={{ xs: "column", md: "row" }} gap={1}>
                        <TextField
                          label="Timecode (optional)"
                          value={commentTimecode}
                          size="small"
                          placeholder="00:12"
                          sx={{ width: { xs: "100%", md: 180 }, flexShrink: 0 }}
                          slotProps={{ htmlInput: { maxLength: 8, inputMode: "text" } }}
                          helperText="MM:SS or HH:MM:SS"
                          onChange={(event) => setCommentTimecode(event.target.value)}
                        />
                        <TextField
                          label="Project comment"
                          value={commentBody}
                          size="small"
                          fullWidth
                          multiline
                          minRows={2}
                          slotProps={{ htmlInput: { maxLength: TEAM_PROJECT_COMMENT_LIMIT } }}
                          helperText={`${commentBody.length}/${TEAM_PROJECT_COMMENT_LIMIT} characters`}
                          onChange={(event) => setCommentBody(event.target.value)}
                        />
                        <Button variant="contained" sx={{ bgcolor: accent, minWidth: 112, alignSelf: { md: "flex-start" }, "&:hover": { bgcolor: accent } }} disabled={Boolean(busyAction) || !commentBody.trim()} onClick={() => runTeamAction("comment", async () => {
                          const normalizedTimecode = normalizeOptionalTimecode(commentTimecode);
                          await addProjectComment({
                            teamId: teamData.workspace._id,
                            projectId: selectedProject.id,
                            body: commentBody,
                            ...(normalizedTimecode ? { timecode: normalizedTimecode } : {}),
                          });
                          setCommentBody("");
                          setCommentTimecode("");
                        })}>Post</Button>
                      </Stack>
                    ) : null}
                  </Stack>
                ) : <EmptyPanel title="No team projects yet" body="Create a team project to start leaving shared comments." />}
              </Paper>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack gap={1.5}>
              <Paper sx={{ ...panelSx, p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Typography sx={{ color: ink, fontSize: 20, fontWeight: 780 }}>Notifications</Typography>
                  {unreadNotifications ? (
                    <Button
                      size="small"
                      disabled={Boolean(busyAction)}
                      onClick={() => runTeamAction("read-all", () => markAllNotificationsRead({ teamId: teamData.workspace._id }))}
                      sx={{ color: accent, fontSize: 12, fontWeight: 760 }}
                    >
                      Mark all read
                    </Button>
                  ) : null}
                </Stack>
                <Stack gap={0.8} sx={{ mt: 1.2 }}>
                  {teamData.notifications.length ? teamData.notifications.map((notification) => (
                    <Stack key={notification._id} direction="row" justifyContent="space-between" gap={1} sx={{ p: 1, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: notification.read ? panel : activeBg }}>
                      <Box>
                        <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{notification.message}</Typography>
                        {notification.projectId ? <Typography sx={{ color: accent, fontSize: 11.5, fontWeight: 760, mt: 0.25 }}>Project: {teamProjectLabel(notification.projectId)}</Typography> : null}
                        <Typography sx={{ color: muted, fontSize: 11, mt: 0.3 }}>{formatActivityTime(notification.createdAt)}</Typography>
                      </Box>
                      <Stack gap={0.35} alignItems="flex-end">
                        {notification.projectId && teamProjectTitles[notification.projectId] ? (
                          <Button
                            size="small"
                            onClick={() => {
                              showTeamProject(notification.projectId);
                              if (!notification.read) {
                                void markNotificationRead({ notificationId: notification._id });
                              }
                            }}
                            sx={{ color: accent }}
                          >
                            View
                          </Button>
                        ) : null}
                        {!notification.read ? <Button size="small" onClick={() => runTeamAction("read", () => markNotificationRead({ notificationId: notification._id }))}>Mark read</Button> : null}
                      </Stack>
                    </Stack>
                  )) : <EmptyPanel title="No notifications" body="Mentions and project notifications will appear here." />}
                </Stack>
              </Paper>

              <Paper sx={{ ...panelSx, p: 2 }}>
                <Typography sx={{ color: ink, fontSize: 20, fontWeight: 780 }}>Activity Feed</Typography>
                <Stack gap={0.8} sx={{ mt: 1.2 }}>
                  {teamData.activity.length ? teamData.activity.map((activity) => (
                    <Box key={activity._id} sx={{ p: 1, borderLeft: `3px solid ${accent}`, bgcolor: softPanel, borderRadius: "5px" }}>
                      <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{activity.message}</Typography>
                      {activity.projectId ? (
                        <Stack direction="row" alignItems="center" gap={0.8} sx={{ mt: 0.35, flexWrap: "wrap" }}>
                          <Typography sx={{ color: accent, fontSize: 11.5, fontWeight: 760 }}>Project: {teamProjectLabel(activity.projectId)}</Typography>
                          {teamProjectTitles[activity.projectId] ? <Button size="small" onClick={() => showTeamProject(activity.projectId)} sx={{ color: accent, p: 0, minWidth: 0, fontSize: 11 }}>View</Button> : null}
                        </Stack>
                      ) : null}
                      <Typography sx={{ color: muted, fontSize: 11, mt: 0.3 }}>{formatActivityTime(activity.createdAt)}</Typography>
                    </Box>
                  )) : <EmptyPanel title="No activity yet" body="Workspace creation, invites, comments, and project updates will appear here." />}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </PageFrame>
  );
}

function TeamChatPage() {
  const { isSignedIn, isLoaded: isUserLoaded, openSignIn } = useAppAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const teamData = useQuery(api.team.getMyWorkspace, isConvexAuthenticated ? {} : "skip");
  const sendChatMessage = useMutation(api.team.sendChatMessage);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const canUseChat = Boolean(teamData?.currentMember.permissions.useChat);

  function formatChatTime(value: string) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  }

  async function submitMessage() {
    const body = message.trim();
    if (!body || !teamData?.workspace || !canUseChat) return;
    setSending(true);
    setChatError("");
    try {
      await sendChatMessage({ teamId: teamData.workspace._id, body });
      setMessage("");
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageFrame
      title="Team Chat"
      subtitle="Quick handoffs, production updates, and Manage Team access for your current workspace."
    >
      {!isUserLoaded ? (
        <Paper sx={{ ...panelSx, p: 3 }}><Stack direction="row" gap={1.2} alignItems="center"><CircularProgress size={18} /><Typography sx={{ color: muted, fontSize: 14 }}>Checking account status...</Typography></Stack></Paper>
      ) : !isSignedIn ? (
        <Paper sx={{ ...panelSx, p: 3 }}>
          <Typography sx={{ color: ink, fontSize: 22, fontWeight: 780 }}>Sign in to open Team Chat</Typography>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.65 }}>Chat is tied to your authenticated team workspace and is not available in local mode.</Typography>
          <Button variant="contained" onClick={() => openSignIn()} sx={{ mt: 1.8, bgcolor: accent, "&:hover": { bgcolor: accent } }}>Sign In</Button>
        </Paper>
      ) : isConvexAuthLoading ? (
        <Paper sx={{ ...panelSx, p: 3 }}><Stack direction="row" gap={1.2} alignItems="center"><CircularProgress size={18} /><Typography sx={{ color: muted, fontSize: 14 }}>Connecting Team Chat...</Typography></Stack></Paper>
      ) : !isConvexAuthenticated ? (
        <Paper sx={{ ...panelSx, p: 3, borderColor: dangerColor, bgcolor: "var(--app-danger-bg)" }}>
          <Typography sx={{ color: dangerColor, fontSize: 18, fontWeight: 780 }}>Team Chat is not connected</Typography>
          <Typography sx={{ color: dangerColor, fontSize: 13, mt: 0.6 }}>Convex has not received your Clerk session. Sign out and back in, then retry.</Typography>
        </Paper>
      ) : teamData === undefined ? (
        <Paper sx={{ ...panelSx, p: 3 }}><Stack direction="row" gap={1.2} alignItems="center"><CircularProgress size={18} /><Typography sx={{ color: muted, fontSize: 14 }}>Loading messages...</Typography></Stack></Paper>
      ) : !teamData ? (
        <Paper sx={panelSx}>
          <EmptyPanel
            title="No team workspace yet"
            body="Create or join a workspace before using Team Chat."
            assetKey="team"
          />
        </Paper>
      ) : !canUseChat ? (
        <Paper sx={{ ...panelSx, p: 3 }}>
          <Typography sx={{ color: ink, fontSize: 22, fontWeight: 780 }}>Chat unavailable for your role</Typography>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.65 }}>Your current role can access the workspace but does not have permission to view or send chat messages.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ ...panelSx, minHeight: { xs: 560, md: "calc(100dvh - 170px)" }, display: "flex", flexDirection: "column" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} sx={{ px: 2, py: 1.7, borderBottom: `1px solid ${border}` }}>
            <Box>
              <Typography sx={{ color: ink, fontSize: 18, fontWeight: 780 }}>{teamData.workspace.name}</Typography>
              <Typography sx={{ color: muted, fontSize: 12, mt: 0.25 }}>{teamData.members.filter((member) => member.status === "active").length} active members · Use @name to notify someone</Typography>
            </Box>
            <Chip label={`${teamData.currentMember.role} access`} size="small" sx={{ alignSelf: { xs: "flex-start", sm: "center" }, bgcolor: activeBg, color: accent, borderRadius: "5px", fontWeight: 760 }} />
          </Stack>

          <Stack gap={1.1} sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 1.4, md: 2 }, py: 2 }}>
            {teamData.chat.length ? teamData.chat.map((chatMessage) => {
              const isOwnMessage = chatMessage.authorUserId === teamData.currentMember.userId;
              return (
                <Box key={chatMessage._id} sx={{ alignSelf: isOwnMessage ? "flex-end" : "flex-start", width: "min(680px, 88%)" }}>
                  <Stack direction="row" justifyContent={isOwnMessage ? "flex-end" : "space-between"} gap={1} sx={{ mb: 0.45 }}>
                    {!isOwnMessage ? <Typography sx={{ color: ink, fontSize: 12, fontWeight: 780 }}>{chatMessage.authorName}</Typography> : null}
                    <Typography sx={{ color: muted, fontSize: 10.5 }}>{formatChatTime(chatMessage.createdAt)}</Typography>
                  </Stack>
                  <Box sx={{ px: 1.4, py: 1.1, bgcolor: isOwnMessage ? activeBg : softPanel, border: `1px solid ${isOwnMessage ? accent : border}`, borderRadius: "8px" }}>
                    <Typography sx={{ color: ink, fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{chatMessage.body}</Typography>
                  </Box>
                </Box>
              );
            }) : (
              <Box sx={{ m: "auto", width: "100%" }}>
                <EmptyPanel title="No messages yet" body="Start with a handoff, blocker, review update, or delivery note." />
              </Box>
            )}
          </Stack>

          <Box sx={{ p: 1.5, borderTop: `1px solid ${border}`, bgcolor: softPanel }}>
            {chatError ? <Typography role="alert" sx={{ color: dangerColor, fontSize: 12, fontWeight: 700, mb: 0.8 }}>{chatError}</Typography> : null}
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems="flex-start">
              <TextField
                label="Message"
                value={message}
                size="small"
                fullWidth
                multiline
                maxRows={4}
                slotProps={{ htmlInput: { maxLength: TEAM_CHAT_MESSAGE_LIMIT } }}
                helperText={`${message.length}/${TEAM_CHAT_MESSAGE_LIMIT} characters`}
                onChange={(event) => {
                  setMessage(event.target.value);
                  if (chatError) setChatError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
              />
              <Button variant="contained" disabled={sending || !message.trim()} onClick={() => void submitMessage()} sx={{ bgcolor: accent, color: "#fff", minWidth: 110, height: 40, "&:hover": { bgcolor: accent } }}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </PageFrame>
  );
}

function IntegrationsDesignPage({
  projects,
  settings,
  setSettings,
  notify,
  onEditProject
}: {
  projects: WorkItem[];
  settings: SettingsState;
  setSettings: (settings: SettingsState) => void;
  notify: (message: string, tone?: ToastState["tone"]) => void;
  onEditProject: (item: WorkItem) => void;
}) {
  const projectLinks = projects.filter((project) => configuredIntegrationCount(project.integrationLinks) > 0);
  const globalCount = configuredIntegrationCount(settings.integrationLinks);

  return (
    <PageFrame
      title="Integrations"
      subtitle="Save external service links for your workspace and individual projects. Links only; no OAuth, syncing, or API access."
    >
      <Stack gap={1.5}>
        <IntegrationLinkManager
          title="Global Integrations"
          subtitle="Workspace-level service links used across your editing workflow."
          links={settings.integrationLinks}
          emptyTitle="No global integration links"
          emptyBody="Add links to shared folders, calendars, channels, and review spaces your studio uses often."
          onChange={(integrationLinks) => {
            setSettings({ ...settings, integrationLinks });
            notify("Global integration links updated.", "success");
          }}
        />

        <Paper sx={{ ...panelSx, p: 2.25 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2} sx={{ mb: 1.5 }}>
            <Box>
              <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Project Integrations</Typography>
              <Typography sx={{ color: muted, fontSize: 13, mt: 0.5 }}>Project-specific links stay attached to each project record.</Typography>
            </Box>
            <Chip label={`${projectLinks.length} projects linked`} size="small" sx={{ alignSelf: { xs: "flex-start", md: "center" }, bgcolor: globalCount ? activeBg : softPanel, color: globalCount ? accent : muted, borderRadius: "5px" }} />
          </Stack>
          {projectLinks.length ? (
            <Stack divider={<Divider flexItem sx={{ borderColor: border }} />} sx={{ border: `1px solid ${border}`, borderRadius: "8px", overflow: "hidden" }}>
              {projectLinks.map((project) => (
                <Stack key={project.id} direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={1.2} sx={{ p: 1.4, bgcolor: panel }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{project.title}</Typography>
                    <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{configuredIntegrationCount(project.integrationLinks)} saved {configuredIntegrationCount(project.integrationLinks) === 1 ? "link" : "links"}</Typography>
                    <Stack direction="row" gap={0.7} flexWrap="wrap" sx={{ mt: 0.8 }}>
                      {integrationServices.map((service) => hasIntegrationLink(project.integrationLinks?.[service.id]) ? (
                        <Chip key={service.id} label={service.shortName} size="small" sx={{ height: 22, borderRadius: "5px", bgcolor: activeBg, color: accent, fontSize: 11 }} />
                      ) : null)}
                    </Stack>
                  </Box>
                  <Button variant="outlined" onClick={() => onEditProject(project)} sx={outlineButtonSx}>Manage Project Links</Button>
                </Stack>
              ))}
            </Stack>
          ) : (
            <EmptyPanel title="No project integration links" body="Open a project and add service links for folders, review pages, channels, or calendar events." />
          )}
        </Paper>
      </Stack>
    </PageFrame>
  );
}

function IntegrationLinkManager({
  title,
  subtitle,
  links,
  emptyTitle,
  emptyBody,
  onChange
}: {
  title: string;
  subtitle: string;
  links: IntegrationLinks | undefined;
  emptyTitle: string;
  emptyBody: string;
  onChange: (links: IntegrationLinks) => void;
}) {
  const [editing, setEditing] = useState<{ serviceId: IntegrationServiceId; link: IntegrationLink } | null>(null);
  const [error, setError] = useState("");
  const configuredCount = configuredIntegrationCount(links);

  function openEditor(serviceId: IntegrationServiceId) {
    setEditing({ serviceId, link: { ...emptyIntegrationLink, ...normalizeIntegrationLink(links?.[serviceId]) } });
    setError("");
  }

  function saveLink() {
    if (!editing) return;
    const link = normalizeIntegrationLink(editing.link);
    if (!isValidIntegrationUrl(link.url)) {
      setError("Enter a valid http or https URL.");
      return;
    }
    onChange({
      ...(links ?? {}),
      [editing.serviceId]: {
        ...link,
        updatedAt: new Date().toISOString()
      }
    });
    setEditing(null);
    setError("");
  }

  function removeLink(serviceId: IntegrationServiceId) {
    const next: IntegrationLinks = { ...(links ?? {}) };
    delete next[serviceId];
    onChange(next);
  }

  function openLink(url: string) {
    if (typeof window === "undefined" || !isValidIntegrationUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Paper sx={{ ...panelSx, p: 2.25 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2} sx={{ mb: 1.5 }}>
        <Box>
          <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>{title}</Typography>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.5 }}>{subtitle}</Typography>
        </Box>
        <Chip label={`${configuredCount} configured`} size="small" sx={{ alignSelf: { xs: "flex-start", md: "center" }, bgcolor: configuredCount ? activeBg : softPanel, color: configuredCount ? accent : muted, borderRadius: "5px" }} />
      </Stack>
      {!configuredCount ? <Box sx={{ mb: 1.4 }}><EmptyPanel title={emptyTitle} body={emptyBody} /></Box> : null}
      <Stack divider={<Divider flexItem sx={{ borderColor: border }} />} sx={{ border: `1px solid ${border}`, borderRadius: "8px", overflow: "hidden" }}>
        {integrationServices.map((service) => {
          const link = links?.[service.id];
          const linked = hasIntegrationLink(link);
          return (
            <Stack key={service.id} direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" gap={1.2} sx={{ p: 1.4, bgcolor: panel }}>
              <Stack direction="row" alignItems="center" gap={1.2} sx={{ minWidth: 0 }}>
                <Box sx={{ width: 34, height: 34, borderRadius: "7px", bgcolor: service.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 760, flexShrink: 0 }}>
                  {service.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" gap={0.8} alignItems="center" sx={{ flexWrap: "wrap" }}>
                    <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{service.name}</Typography>
                    <Chip
                      label={integrationStatusLabel(link)}
                      size="small"
                      sx={{
                        height: 20,
                        borderRadius: "5px",
                        bgcolor: linked ? "var(--app-success-bg, #e9f5e9)" : softPanel,
                        color: linked ? successColor : muted,
                        fontSize: 11,
                        fontWeight: 720
                      }}
                    />
                  </Stack>
                  <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.3, maxWidth: { xs: "100%", sm: 520 } }}>
                    {integrationDisplayText(link, service.description)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" gap={0.8} justifyContent={{ xs: "flex-start", sm: "flex-end" }} flexWrap="wrap">
                {linked && link ? (
                  <Button variant="outlined" startIcon={<OpenInNewIcon sx={{ fontSize: 17 }} />} onClick={() => openLink(link.url)} sx={outlineButtonSx}>Open</Button>
                ) : null}
                {linked ? (
                  <Button variant="outlined" onClick={() => removeLink(service.id)} sx={{ ...outlineButtonSx, color: dangerColor }}>Remove</Button>
                ) : null}
                <Button variant="outlined" onClick={() => openEditor(service.id)} sx={outlineButtonSx}>{linked ? "Edit" : "Add Link"}</Button>
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 760 }}>
          {editing ? `${hasIntegrationLink(links?.[editing.serviceId]) ? "Edit" : "Add"} ${integrationServices.find((service) => service.id === editing.serviceId)?.name} Link` : "Integration Link"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField
              label="URL"
              value={editing?.link.url ?? ""}
              onChange={(event) => {
                setEditing((current) => current ? { ...current, link: { ...current.link, url: event.target.value } } : current);
                setError("");
              }}
              fullWidth
              autoFocus
              placeholder="https://..."
              error={Boolean(error)}
            />
            <TextField
              label="Label"
              value={editing?.link.label ?? ""}
              onChange={(event) => setEditing((current) => current ? { ...current, link: { ...current.link, label: event.target.value } } : current)}
              fullWidth
              placeholder="Client review folder"
            />
            <TextField
              label="Notes"
              value={editing?.link.notes ?? ""}
              onChange={(event) => setEditing((current) => current ? { ...current, link: { ...current.link, notes: event.target.value } } : current)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Optional context for this link"
            />
            {error ? <Typography sx={{ color: dangerColor, fontSize: 13 }}>{error}</Typography> : null}
            <Typography sx={{ color: muted, fontSize: 12 }}>This stores a link only. CutLab will not authenticate, browse files, sync data, or call this service.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditing(null)} sx={{ color: muted }}>Cancel</Button>
          <Button onClick={saveLink} variant="contained" sx={{ bgcolor: accent, color: cutlab.color.softWhite, "&:hover": { bgcolor: "var(--app-highlight)", color: cutlab.color.charcoal } }}>Save Link</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function SettingsDesignPage({ settings, setSettings, onNewProject, notify }: { settings: SettingsState; setSettings: (settings: SettingsState) => void; onNewProject: () => void; notify: (message: string, tone?: ToastState["tone"]) => void }) {
  const stageColors = [cutlab.color.teal, cutlab.color.cyan, cutlab.color.warning, cutlab.color.success, cutlab.color.steel, cutlab.color.error];
  const stageIssues = projectStageIssues(settings.projectStages);
  const tagIssues = projectTagIssues(settings.projectTags);
  const rolePolicy = [
    { role: "Owner", permissions: ["Create and edit projects", "Update project stages", "Leave project notes", "Assign work", "Mention teammates", "Use team chat", "Manage members and roles"] },
    { role: "Editor", permissions: ["Create and edit projects", "Update project stages", "Leave project notes", "Assign work", "Mention teammates", "Use team chat"] },
    { role: "Reviewer", permissions: ["View team projects", "Leave project notes", "Mention teammates", "Use team chat"] }
  ];

  function updateNotification(name: string, enabled: boolean) {
    setSettings({ ...settings, notifications: { ...settings.notifications, [name]: enabled } });
    notify(`${name} notifications ${enabled ? "enabled" : "disabled"}.`, "info");
  }

  function updateStage(index: number, value: string) {
    const projectStages = [...settings.projectStages];
    projectStages[index] = value;
    setSettings({ ...settings, projectStages });
  }

  function removeStage(index: number) {
    setSettings({ ...settings, projectStages: settings.projectStages.filter((_, stageIndex) => stageIndex !== index) });
  }

  function updateProjectTag(index: number, value: string) {
    const projectTags = [...settings.projectTags];
    const previous = projectTags[index];
    projectTags[index] = value;
    const nextSalaryWorkType = previous && previous === settings.salaryWorkType ? value : settings.salaryWorkType;
    setSettings({ ...settings, projectTags, salaryWorkType: nextSalaryWorkType });
  }

  function addProjectTag() {
    setSettings({ ...settings, projectTags: [...settings.projectTags, nextProjectTagName(settings.projectTags)] });
  }

  function removeProjectTag(index: number) {
    const removed = settings.projectTags[index];
    const projectTags = settings.projectTags.filter((_, tagIndex) => tagIndex !== index);
    const salaryWorkType = removed === settings.salaryWorkType ? projectTags[0] : settings.salaryWorkType;
    setSettings({ ...settings, projectTags, salaryWorkType });
  }

  function updateSalaryBatchSize(value: string) {
    setSettings({ ...settings, salaryBatchSize: normalizedSalaryBatchSize(Number(value || defaultSalaryBatchSize)) });
  }

  function updateSalaryBatchAmount(value: string) {
    setSettings({ ...settings, salaryBatchAmount: normalizedSalaryBatchAmount(Number(value || defaultSalaryBatchAmount)) });
  }

  function resetSettings() {
    setSettings({ ...defaultSettings, customClients: [...defaultSettings.customClients], customProjectTemplates: defaultSettings.customProjectTemplates.map((template) => ({ ...template, workflowStages: [...template.workflowStages], deliverables: template.deliverables.map((item) => ({ ...item })), checklistItems: [...template.checklistItems] })), projectTags: [...defaultSettings.projectTags], projectStages: [...defaultSettings.projectStages], notifications: { ...defaultSettings.notifications }, integrations: { ...defaultSettings.integrations }, integrationAccounts: { ...defaultSettings.integrationAccounts }, integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)), integrationLinks: {}, teamMembers: defaultSettings.teamMembers.map((m) => ({ ...m })), editorPermissions: { ...defaultSettings.editorPermissions }, rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)) });
    notify("Settings reset to defaults.", "warning");
  }

  function formatTimestamp(iso: string) {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
    } catch { return ""; }
  }

  return (
    <PageFrame
      title="Settings"
      subtitle="Manage profile, workflow, notifications, and display preferences."
      action={
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
          <Button variant="outlined" onClick={resetSettings} sx={{ ...outlineButtonSx, color: dangerColor }}>Reset</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onNewProject} sx={outlineButtonSx}>New Project</Button>
        </Stack>
      }
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "200px minmax(0, 1fr)" }, gap: { xs: 2, lg: 3.5 }, alignItems: "start" }}>
        <Box component="nav" aria-label="Settings sections" sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: 76, border: `1px solid ${border}`, borderRadius: "8px", bgcolor: panel, p: 1.25 }}>
          <SectionEyebrow>Settings index</SectionEyebrow>
          <Stack sx={{ mt: 1 }}>
            {[
              ["#project-rules", "Project rules"],
              ["#workflow", "Workflow"],
              ["#notifications", "Notifications"],
              ["#permissions", "Permissions"],
              ["#integrations", "Integrations"],
              ["#appearance", "Appearance"],
              ["#regional", "Regional"]
            ].map(([href, label]) => (
              <Button key={href} component="a" href={href} sx={{ justifyContent: "flex-start", color: muted, px: 1, minHeight: 34, borderRadius: "5px", fontSize: 12.5, "&:hover": { color: accent, bgcolor: activeBg } }}>{label}</Button>
            ))}
          </Stack>
          <Typography sx={{ color: muted, fontSize: 11, lineHeight: 1.5, mt: 2, pr: 2 }}>Changes save automatically to the active workspace.</Typography>
        </Box>
        <Stack gap={settings.density === "Compact" ? 1 : 1.5} sx={{ minWidth: 0 }}>
        <SettingsPanel id="project-rules" title="Project Tags & Salary" subtitle="Customize project tags, the salary tag, payout amount, and videos needed per batch.">
            <Stack gap={1.1}>
              {settings.projectTags.map((tag, index) => (
                <Stack key={`project-tag-${index}`} direction="row" alignItems="center" gap={1.2} sx={{ minWidth: 0 }}>
                  <TextField
                    label={`Tag ${index + 1}`}
                    value={tag}
                    size="small"
                    fullWidth
                    sx={{ minWidth: 0 }}
                    error={Boolean(tagIssues && !tag.trim())}
                    onChange={(event) => updateProjectTag(index, event.target.value)}
                    inputProps={{ "aria-label": `Project tag ${index + 1}` }}
                  />
                  <Tooltip title="Remove tag">
                    <Button
                      size="small"
                      aria-label={`Remove project tag ${index + 1}`}
                      disabled={settings.projectTags.length <= 1}
                      onClick={() => removeProjectTag(index)}
                      sx={{ minWidth: 34, width: 34, height: 34, color: dangerColor, p: 0, flexShrink: 0 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </Button>
                  </Tooltip>
                </Stack>
              ))}
              <Button variant="outlined" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={addProjectTag} sx={outlineButtonSx}>
                Add Tag
              </Button>
              {tagIssues ? <Typography sx={{ color: dangerColor, fontSize: 13 }}>{tagIssues}</Typography> : null}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.2, pt: 0.8 }}>
                <DialogSelect
                  label="Salary Tag"
                  value={canonicalWorkType(settings.salaryWorkType, settings.projectTags)}
                  options={settings.projectTags}
                  onChange={(value) => setSettings({ ...settings, salaryWorkType: value })}
                />
                <TextField
                  label="Videos per salary batch"
                  type="number"
                  size="small"
                  value={normalizedSalaryBatchSize(settings.salaryBatchSize)}
                  onChange={(event) => updateSalaryBatchSize(event.target.value)}
                  inputProps={{ min: 1, step: 1 }}
                />
                <TextField
                  label="Salary per batch"
                  type="number"
                  size="small"
                  value={normalizedSalaryBatchAmount(settings.salaryBatchAmount)}
                  onChange={(event) => updateSalaryBatchAmount(event.target.value)}
                  inputProps={{ min: 1, step: 1 }}
                />
              </Box>
              <Typography sx={{ color: muted, fontSize: 12 }}>
                Completed projects tagged "{canonicalWorkType(settings.salaryWorkType, settings.projectTags)}" count toward {normalizedSalaryBatchSize(settings.salaryBatchSize)} videos per salary batch worth {money(normalizedSalaryBatchAmount(settings.salaryBatchAmount), settings.currencyCode)}.
              </Typography>
            </Stack>
          </SettingsPanel>
        <SettingsPanel id="workflow" title="Project Stages" subtitle="Default workflow stages for new work.">
            {settings.projectStages.map((stage, index) => (
              <Stack key={`project-stage-${index}`} direction="row" alignItems="center" gap={1.2}>
                <Box sx={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, bgcolor: stageColors[index % stageColors.length] }} />
                <TextField
                  value={stage}
                  size="small"
                  fullWidth
                  onChange={(event) => updateStage(index, event.target.value)}
                  inputProps={{ "aria-label": `Workflow stage ${index + 1}` }}
                />
                <Tooltip title="Remove stage">
                  <Button
                    size="small"
                    aria-label={`Remove workflow stage ${index + 1}`}
                    disabled={settings.projectStages.length <= 1}
                    onClick={() => removeStage(index)}
                    sx={{ minWidth: 34, width: 34, height: 34, color: dangerColor, p: 0 }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </Button>
                </Tooltip>
              </Stack>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={() => setSettings({ ...settings, projectStages: [...settings.projectStages, nextStageName(settings.projectStages)] })}
              sx={outlineButtonSx}
            >
              Add Stage
            </Button>
            {stageIssues ? <Typography sx={{ color: dangerColor, fontSize: 13 }}>{stageIssues}</Typography> : null}
          </SettingsPanel>
        <SettingsPanel id="notifications" title="Notifications" subtitle="Choose when project and team events should surface.">
            {Object.keys(defaultSettings.notifications).map((item) => (
              <Stack key={item} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.05, borderBottom: `1px solid ${border}` }}>
                <Box>
                  <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{item}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.2 }}>{notificationCopy(item)}</Typography>
                </Box>
                <Switch checked={Boolean(settings.notifications[item])} onChange={(event) => updateNotification(item, event.target.checked)} color="primary" />
              </Stack>
            ))}
            <SettingsLink label="Toggle weekly summary" onClick={() => updateNotification("Weekly summary", !settings.notifications["Weekly summary"])} />
          </SettingsPanel>
        <SettingsPanel id="permissions" title="Team Roles & Permissions" subtitle="Convex enforces these fixed workspace roles on every shared action.">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" }, gap: 1.2 }}>
              {rolePolicy.map(({ role, permissions }) => (
                <Box key={role} sx={{ p: 1.5, borderTop: `2px solid ${role === "Owner" ? accent : role === "Editor" ? warningColor : successColor}`, bgcolor: softPanel }}>
                  <Stack direction="row" alignItems="center" gap={0.8}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: role === "Owner" ? accent : role === "Editor" ? warningColor : successColor }} />
                    <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{role}</Typography>
                  </Stack>
                  <Stack gap={0.7} sx={{ mt: 1.2 }}>
                    {permissions.map((permission) => (
                      <Stack key={permission} direction="row" alignItems="flex-start" gap={0.7}>
                        <CheckCircleOutlineIcon sx={{ color: accent, fontSize: 16, mt: 0.05 }} />
                        <Typography sx={{ color: muted, fontSize: 11.8, lineHeight: 1.4 }}>{permission}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
            <Typography sx={{ color: muted, fontSize: 12 }}>Clients collaborate through private Client Portal links and are not workspace members.</Typography>
          </SettingsPanel>
        <Box id="integrations" sx={{ scrollMarginTop: 24 }}>
        <IntegrationLinkManager
          title="Integrations"
          subtitle="Save workspace-level links for storage, messaging, calendars, and review tools."
          links={settings.integrationLinks}
          emptyTitle="No integration links configured"
          emptyBody="Add links to shared folders, calendars, review pages, or team channels. This does not connect to external APIs."
          onChange={(integrationLinks) => {
            setSettings({ ...settings, integrationLinks });
            notify("Integration links updated.", "success");
          }}
        />
        </Box>
        <SettingsPanel id="appearance" title="Appearance" subtitle="Customize how CutLab looks and feels for your tracker.">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2, alignItems: "end" }}>
              <SegmentedSetting label="Theme" options={["Light", "Dark", "System"]} active={settings.theme} onChange={(value) => setSettings({ ...settings, theme: value })} />
              <Box>
                <Typography sx={{ color: muted, fontSize: 12, fontWeight: 680, mb: 1 }}>Accent Color</Typography>
                <Stack direction="row" gap={1.2}>
                  {[cutlab.color.teal, cutlab.color.cyan, cutlab.color.deepTeal, cutlab.color.aqua, cutlab.color.slate, cutlab.color.steel].map((color) => (
                    <Box key={color} component="button" type="button" aria-label={`Use accent color ${color}`} onClick={() => setSettings({ ...settings, accentColor: color })} sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: color, cursor: "pointer", border: settings.accentColor === color ? `3px solid ${cutlab.color.softWhite}` : `1px solid ${border}`, p: 0 }} />
                  ))}
                </Stack>
              </Box>
              <SegmentedSetting label="Density" options={["Comfortable", "Compact"]} active={settings.density} onChange={(value) => setSettings({ ...settings, density: value })} />
            </Box>
          </SettingsPanel>
        <SettingsPanel id="regional" title="Regional Preferences" subtitle="Choose the currency used for earnings and payout totals.">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <DialogSelect
                label="Currency"
                value={currencyLabels[settings.currencyCode] ?? settings.currencyCode}
                options={currencyOptions.map((code) => currencyLabels[code])}
                onChange={(value) => {
                  const nextCode = Object.entries(currencyLabels).find(([, label]) => label === value)?.[0] ?? settings.currencyCode;
                  setSettings({ ...settings, currencyCode: nextCode });
                  notify(`Currency changed to ${nextCode}.`, "info");
                }}
              />
              <TextField label="Preview" value={money(12500, settings.currencyCode)} size="small" InputProps={{ readOnly: true }} />
            </Box>
          </SettingsPanel>
      </Stack>
      </Box>
    </PageFrame>
  );
}

function TimelineDesignPage({ projects }: { projects: WorkItem[] }) {
  const settings = useTrackerSettings();
  const timeline = [...projects].sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate));

  return (
    <PageFrame title="Timeline" subtitle="A delivery-date view for every tracked project.">
      <Box component="section" sx={{ borderTop: `1px solid ${border}`, pt: { xs: 2.5, md: 3 } }}>
        <Stack sx={{ mb: 3 }}>
          <Typography sx={{ color: ink, fontSize: 24, fontWeight: 760 }}>Delivery timeline</Typography>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.5 }}>A dated production rail with status, owner context, and progress.</Typography>
        </Stack>
        <Box sx={{ position: "relative", pl: { xs: 0, md: 5 } }}>
          <Box sx={{ display: { xs: "none", md: "block" }, position: "absolute", left: 18, top: 8, bottom: 8, width: 2, bgcolor: border, borderRadius: 99 }} />
          <Stack gap={0}>
            {timeline.length ? timeline.map((project, index) => (
              <Box key={project.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "150px minmax(0, 1fr) 180px" }, gap: 2, py: 2.25, borderBottom: `1px solid ${border}`, position: "relative", alignItems: "center" }}>
                <Box sx={{ display: { xs: "none", md: "grid" }, position: "absolute", left: -34, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", placeItems: "center", bgcolor: panel, border: `1px solid ${border}` }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: projectTimelineColor(project.status) }} />
                </Box>
                <Box>
                  <Typography sx={{ color: projectTimelineColor(project.status), fontSize: 13, fontWeight: 760 }}>{profileStatusLabel(project.status)}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{formatDate(project.dueDate, settings.dateFormat)}</Typography>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>{project.title}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{project.client || project.workType}</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.55 }}>{project.notes || "No project notes saved."}</Typography>
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.65 }}>
                    <Typography sx={{ color: muted, fontSize: 12 }}>Progress</Typography>
                    <Typography sx={{ color: ink, fontSize: 12, fontWeight: 720 }}>{projectProgress(project.status)}%</Typography>
                  </Stack>
                <LinearProgress variant="determinate" value={projectProgress(project.status)} sx={{ height: 6, borderRadius: 99, bgcolor: headerPanel, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
                </Box>
              </Box>
            )) : (
              <EmptyPanel title="No projects available" body="Projects appear here after you add work with due dates." />
            )}
          </Stack>
        </Box>
      </Box>
    </PageFrame>
  );
}

function OrganizationProfilePage({ projects, settings, stats }: { projects: WorkItem[]; settings: SettingsState; stats: { active: number; delivered: number; earned: number; salaryEdits: number } }) {
  const membersByRole = settings.teamMembers.reduce<Record<string, number>>((roles, member) => {
    roles[member.role] = (roles[member.role] || 0) + 1;
    return roles;
  }, {});
  const activeProjects = projects.filter((project) => !isDoneStatus(project.status)).slice(0, 6);

  return (
    <PageFrame
      title="Organization Profile"
      subtitle="Studio-level view for team ownership, delivery context, and active work."
    >
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 3 }}><StatCard label="Studio" value={settings.studioName} helper="Local tracker" /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><StatCard label="Team Members" value={String(settings.teamMembers.length)} helper={`${Object.keys(membersByRole).length} active roles`} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><StatCard label="Active Work" value={String(stats.active)} helper={`${stats.delivered} delivered`} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><StatCard label="Tracked Value" value={money(stats.earned, settings.currencyCode)} helper={`${stats.salaryEdits} salary edits`} /></Grid>
      </Grid>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.2fr) 420px" }, gap: 2 }}>
        <Paper sx={{ ...panelSx, p: 2.25 }}>
          <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Team access</Typography>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.6 }}>Members and permissions are stored locally for this team.</Typography>
          <Stack gap={1.1} sx={{ mt: 2 }}>
            {settings.teamMembers.length ? settings.teamMembers.map((member) => (
              <Box key={member.id} sx={{ display: "grid", gridTemplateColumns: "38px minmax(0, 1fr) auto", gap: 1.1, alignItems: "center", p: 1, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: softPanel }}>
                <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: activeBg, color: accent, display: "grid", placeItems: "center", fontWeight: 760 }}>{initials(member.name)}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{member.name}</Typography>
                  <Typography noWrap sx={{ color: muted, fontSize: 12 }}>{member.email || "No email saved"}</Typography>
                </Box>
                <Chip label={member.role} size="small" sx={{ bgcolor: panel, border: `1px solid ${border}`, color: ink, borderRadius: "5px" }} />
              </Box>
            )) : <EmptyPanel title="No team members yet" body="Add team members from the Team page to populate this organization view." />}
          </Stack>
        </Paper>
        <Paper sx={{ ...panelSx, p: 2.25, gridColumn: { xl: "1 / -1" } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1.5 }}>
            <Box>
              <Typography sx={{ color: ink, fontSize: 20, fontWeight: 760 }}>Active organization work</Typography>
              <Typography sx={{ color: muted, fontSize: 13, mt: 0.4 }}>Current queue across the studio.</Typography>
            </Box>
          </Stack>
          <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
            {activeProjects.length ? activeProjects.map((project) => (
              <Box key={project.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 160px 130px" }, gap: 2, py: 1.2, alignItems: "center" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{project.title}</Typography>
                  <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.3 }}>{project.client || project.workType}</Typography>
                </Box>
                <Typography sx={{ color: muted, fontSize: 13 }}>{formatDate(project.dueDate, settings.dateFormat)}</Typography>
                <StatusChip status={project.status} />
              </Box>
            )) : <EmptyPanel title="No active organization work" body="Active projects appear here after new work is planned." />}
          </Stack>
        </Paper>
      </Box>
    </PageFrame>
  );
}

function ProfileDesignPage({ projects, stats, settings }: { projects: WorkItem[]; stats: { active: number; delivered: number; avgTurnaroundDays: number }; settings: SettingsState }) {
  const { isSignedIn } = useData();
  const publishPublicProfile = useMutation(api.publicProfiles.publish);
  const timeline = [...projects]
    .sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate))
    .slice(0, 5);
  const publicActiveProjects = publicMetric(settings.publicActiveProjects);
  const publicDeliveredEdits = publicMetric(settings.publicDeliveredEdits);
  const publicTurnaroundDays = Math.max(1, publicMetric(settings.publicTurnaroundDays, 3));
  const currentTurnaround = `${publicTurnaroundDays}`;
  const [shareCopied, setShareCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  async function shareProfile() {
    const slug = publicProfileSlug(settings);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/u/${slug}`;
    const text = `${profileDisplayName(settings)} - ${settings.profileTitle || "Video Editor"}`;
    try {
      if (!isSignedIn) throw new Error("Sign in to publish a public profile.");
      setShareMessage("");
      await publishPublicProfile({
        slug,
        studioName: settings.studioName,
        profileName: profileDisplayName(settings),
        profileUsername: slug,
        profileTitle: settings.profileTitle,
        profileBio: settings.profileBio,
        profileLocation: settings.profileLocation,
        profileImageUrl: settings.profileImageUrl,
        timeZone: settings.timeZone,
        activeProjects: publicActiveProjects,
        deliveredEdits: publicDeliveredEdits,
        avgTurnaroundDays: publicTurnaroundDays,
        projects: timeline.map((project) => ({
          title: project.title,
          status: project.status,
          workType: project.workType,
          dueDate: project.dueDate,
        })),
      });
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }
      if (await copyText(url)) {
        setShareCopied(true);
        setShareMessage(`Public profile published: /u/${slug}`);
        window.setTimeout(() => setShareCopied(false), 1400);
      }
    } catch (error) {
      setShareCopied(false);
      setShareMessage(error instanceof Error ? error.message : "Could not publish public profile.");
    }
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1480, mx: "auto", px: { xs: 2, md: 4, xl: 5 }, py: 3, bgcolor: canvas, minHeight: "100dvh" }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" gap={2} sx={{ pb: 2.5 }}>
        <CutLabLockup compact subtitle="Video editing tracker" />
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<PersonOutlineOutlinedIcon />} onClick={shareProfile} sx={outlineButtonSx}>{shareCopied ? "Published + Copied" : "Share Profile"}</Button>
        </Stack>
      </Stack>
      {shareMessage ? <Typography sx={{ color: shareMessage.startsWith("Public profile") ? accent : dangerColor, fontSize: 13, textAlign: "right", mb: 1 }}>{shareMessage}</Typography> : null}

      <Box component="main" sx={{ mt: 2.5, borderTop: `1px solid ${border}` }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.3fr) minmax(420px, 0.8fr)" }, gap: { xs: 3, lg: 7 }, py: { xs: 3, md: 5 }, alignItems: "center" }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} gap={3}>
            <ProfileAvatar settings={settings} size={128} fontSize={36} />
            <Box>
            <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: 34, fontWeight: 700, lineHeight: 1.1 }}>{profileDisplayName(settings)}</Typography>
            {displayUsername(settings) ? <Typography sx={{ color: accent, fontSize: 14, fontWeight: 720, mt: 0.6 }}>{displayUsername(settings)}</Typography> : null}
            <Typography sx={{ color: ink, fontSize: 15, mt: 0.8 }}>{settings.profileTitle}</Typography>
            <Typography sx={{ color: muted, fontSize: 14, mt: 1.5, maxWidth: 420 }}>{settings.profileBio}</Typography>
            <Stack direction="row" gap={2} sx={{ mt: 2, flexWrap: "wrap", color: muted }}>
              <ClientInfoRow icon={<PlaceOutlinedIcon />} text={settings.profileLocation} />
              <ClientInfoRow icon={<PublicOutlinedIcon />} text={settings.timeZone} />
            </Stack>
            </Box>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, py: 2.25, "& > div + div": { borderLeft: `1px solid ${border}` } }}>
            <ProfileMetric icon={<PlayArrowRoundedIcon />} label="Active" sublabel="projects" value={String(publicActiveProjects)} />
            <ProfileMetric icon={<CheckCircleOutlineIcon />} label="Delivered" sublabel="edits" value={String(publicDeliveredEdits)} />
            <ProfileMetric icon={<AccessTimeOutlinedIcon />} label="Turnaround" sublabel="average" value={`${currentTurnaround}d`} />
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "240px minmax(0, 1fr)" }, gap: { xs: 2.5, xl: 6 }, py: { xs: 3, md: 4 }, borderTop: `1px solid ${border}`, alignItems: "start" }}>
          <Box sx={{ position: { xl: "sticky" }, top: 24 }}>
            <Typography sx={{ color: ink, fontSize: 24, fontWeight: 720, lineHeight: 1.1 }}>Recent work</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 1, maxWidth: 230 }}>Recent delivery history and near-term work from the tracker.</Typography>
          </Box>
          <Box sx={{ position: "relative", pl: { xs: 0, md: 3 } }}>
            <Box sx={{ display: { xs: "none", md: "block" }, position: "absolute", left: 8, top: 14, bottom: 14, width: 2, bgcolor: border, borderRadius: 99 }} />
            <Stack gap={0}>
              {timeline.length ? timeline.map((project, index) => (
                <Box key={project.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "120px minmax(0, 1fr) 130px" }, gap: 2, alignItems: "start", py: 2.25, borderBottom: `1px solid ${border}`, position: "relative" }}>
                  <Box sx={{ display: { xs: "none", md: "block" }, position: "absolute", left: -24, top: 22, width: 14, height: 14, borderRadius: "50%", bgcolor: projectTimelineColor(project.status), border: `3px solid ${panel}`, boxShadow: `0 0 0 1px ${border}` }} />
                  <Box>
                    <Typography sx={{ color: projectTimelineColor(project.status), fontSize: 12, fontWeight: 760 }}>{profileStatusLabel(project.status)}</Typography>
                    <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>{formatDate(project.dueDate, settings.dateFormat)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>{project.title}</Typography>
                    <Typography sx={{ color: muted, fontSize: 13, mt: 0.35 }}>{project.client || project.workType}</Typography>
                    <Typography sx={{ color: muted, fontSize: 13, mt: 0.65, maxWidth: 620 }}>{project.notes || "No notes saved for this project."}</Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                    <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{Math.max(1, daysBetween(project.startDate, project.dueDate))} days</Typography>
                    <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>turnaround</Typography>
                  </Box>
                </Box>
              )) : <EmptyPanel title="No projects available" body="Projects will appear here once the tracker has saved records." />}
            </Stack>
          </Box>
        </Box>
      </Box>
      <Typography sx={{ color: muted, fontSize: 13, textAlign: "center", mt: 2.5 }}>Shared from {settings.studioName} - Video Editing Tracker &nbsp; | &nbsp; Updated {formatDate(iso(todayDate()), settings.dateFormat)}, {todayDate().getFullYear()}</Typography>
    </Box>
  );
}

function ProfileEditPage({ settings, setSettings }: { settings: SettingsState; setSettings: (settings: SettingsState) => void }) {
  async function uploadProfileImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSettings({ ...settings, profileImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1560, mx: "auto", px: { xs: 2, md: 4, xl: 5 }, pt: { xs: 3, md: 4.5 }, pb: 6 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 36, color: ink, fontWeight: 760, lineHeight: 1.05, fontFamily: headingFont }}>Edit Profile</Typography>
          <Typography sx={{ fontSize: 15, color: muted, mt: 1 }}>Update the identity shown on your public profile.</Typography>
        </Box>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, gap: 3 }}>
        <Box>
          <Box sx={{ display: "grid", placeItems: "center" }}>
            <ProfileAvatar settings={settings} size={160} fontSize={48} />
          </Box>
          <Stack direction="row" gap={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button component="label" variant="outlined" sx={outlineButtonSx}>
              Upload Photo
              <input hidden type="file" accept="image/*" onChange={uploadProfileImage} />
            </Button>
            <Button variant="outlined" disabled={!settings.profileImageUrl} onClick={() => setSettings({ ...settings, profileImageUrl: "" })} sx={outlineButtonSx}>Clear</Button>
          </Stack>
          <Typography sx={{ color: muted, fontSize: 13, textAlign: "center", mt: 2, maxWidth: 260, mx: "auto" }}>
            Upload an image or paste an image URL below. The latest saved photo will appear anywhere your profile is shown.
          </Typography>
        </Box>
        <Stack gap={2}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <TextField label="Profile Name" value={settings.profileName} size="small" fullWidth onChange={(event) => setSettings({ ...settings, profileName: event.target.value })} />
            <TextField label="Username" value={settings.profileUsername} size="small" fullWidth placeholder="@yourname" onChange={(event) => setSettings({ ...settings, profileUsername: sanitizeUsername(event.target.value) })} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <TextField label="Profile Title" value={settings.profileTitle} size="small" fullWidth onChange={(event) => setSettings({ ...settings, profileTitle: event.target.value })} />
            <TextField
              label="Profile Image URL"
              value={settings.profileImageUrl}
              size="small"
              fullWidth
              placeholder="https://example.com/photo.jpg"
              error={Boolean(settings.profileImageUrl.trim() && !isValidProfileImageSource(settings.profileImageUrl))}
              helperText={settings.profileImageUrl.trim() && !isValidProfileImageSource(settings.profileImageUrl) ? "Use an http(s) image URL or upload an image file." : ""}
              onChange={(event) => setSettings({ ...settings, profileImageUrl: event.target.value.trim() })}
            />
          </Box>
          <TextField label="Profile Bio" value={settings.profileBio} size="small" fullWidth multiline minRows={3} onChange={(event) => setSettings({ ...settings, profileBio: event.target.value })} />
          <TextField label="Profile Location" value={settings.profileLocation} size="small" fullWidth onChange={(event) => setSettings({ ...settings, profileLocation: event.target.value })} />
          <Paper sx={{ ...panelSx, p: 2, boxShadow: "none" }}>
            <Typography sx={{ color: ink, fontSize: 18, fontWeight: 760 }}>Public Profile Stats</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 0.5, mb: 1.5 }}>
              These are portfolio-facing numbers. They do not need to match your private tracker totals.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5 }}>
              <TextField
                label="Active Projects"
                type="number"
                value={publicMetric(settings.publicActiveProjects)}
                size="small"
                inputProps={{ min: 0, step: 1 }}
                onChange={(event) => setSettings({ ...settings, publicActiveProjects: publicMetric(Number(event.target.value)) })}
              />
              <TextField
                label="Delivered Edits"
                type="number"
                value={publicMetric(settings.publicDeliveredEdits)}
                size="small"
                inputProps={{ min: 0, step: 1 }}
                onChange={(event) => setSettings({ ...settings, publicDeliveredEdits: publicMetric(Number(event.target.value)) })}
              />
              <TextField
                label="Turnaround Days"
                type="number"
                value={Math.max(1, publicMetric(settings.publicTurnaroundDays, 3))}
                size="small"
                inputProps={{ min: 1, step: 1 }}
                onChange={(event) => setSettings({ ...settings, publicTurnaroundDays: Math.max(1, publicMetric(Number(event.target.value), 3)) })}
              />
            </Box>
          </Paper>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <DialogSelect label="Time Zone" value={settings.timeZone} options={["Asia/Dubai", "Pacific Time", "Eastern Time", "UTC"]} onChange={(value) => setSettings({ ...settings, timeZone: value })} />
            <DialogSelect label="Date Format" value={settings.dateFormat} options={["Month Day, Year", "Day Month Year", "YYYY-MM-DD"]} onChange={(value) => setSettings({ ...settings, dateFormat: value })} />
          </Box>
          <Box>
            <Typography sx={{ color: muted, fontSize: 12, fontWeight: 680, mb: 1 }}>Week Start Day</Typography>
            <Stack direction="row" gap={1}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <Button
                  key={day}
                  onClick={() => setSettings({ ...settings, weekStart: day })}
                  sx={{ flex: 1, py: 1.1, minWidth: 0, border: `1px solid ${border}`, bgcolor: settings.weekStart === day ? activeBg : panel, color: settings.weekStart === day ? accent : ink, borderRadius: "5px", fontSize: 12, fontWeight: 720 }}
                >
                  {day}
                </Button>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

function PageFrame({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  const page = useContext(PageContext);
  const reduceMotion = useHydratedReducedMotion();
  return (
    <motion.div
      key={page}
      initial={reduceMotion ? false : { opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box sx={{ width: "100%", maxWidth: 1580, minHeight: "calc(100dvh - 56px)", mx: "auto", px: { xs: 1.5, sm: 2.5, lg: 3 }, pt: { xs: 2, md: 2.5 }, pb: 6 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-end" }} gap={2} sx={{ mb: 2.5, pb: 2, borderBottom: `1px solid ${border}` }}>
          <Box>
            <SectionEyebrow>Workspace / {title}</SectionEyebrow>
            <Typography sx={{ fontSize: { xs: 22, md: 24 }, color: ink, fontWeight: 650, lineHeight: 1.15, fontFamily: headingFont, mt: 0.7, letterSpacing: "-0.01em" }}>{title}</Typography>
            <Typography sx={{ fontSize: 12, color: muted, mt: 0.65, maxWidth: 700, lineHeight: 1.5 }}>{subtitle}</Typography>
          </Box>
          {action ? <Stack direction="row" alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }} gap={1.5} sx={{ flexShrink: 0 }}>{action}</Stack> : null}
        </Stack>
        {children}
      </Box>
    </motion.div>
  );
}

function NotificationBell({ settings }: { settings: SettingsState }) {
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const { isSignedIn, isLoaded: isUserLoaded } = useAppAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const teamData = useQuery(api.team.getMyWorkspace, isConvexAuthenticated ? {} : "skip");
  const markNotificationRead = useMutation(api.team.markNotificationRead);
  const markAllNotificationsRead = useMutation(api.team.markAllNotificationsRead);
  const notificationOpen = Boolean(notificationAnchor);
  const enabledNotifications = Object.entries(settings.notifications).filter(([, enabled]) => enabled);
  const teamNotifications = teamData?.notifications ?? [];
  const unreadCount = teamNotifications.filter((notification) => !notification.read).length;
  const teamNotificationSyncUnavailable = Boolean(isUserLoaded && isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated);

  return (
    <>
      <Tooltip title="Notifications">
        <Button
          aria-label="Open notifications"
          aria-haspopup="menu"
          aria-expanded={notificationOpen ? "true" : undefined}
          onClick={(event) => setNotificationAnchor(event.currentTarget)}
          sx={{ minWidth: 36, width: 36, height: 36, p: 0, color: ink, borderRadius: "6px", position: "relative" }}
        >
          <NotificationsNoneOutlinedIcon sx={{ color: ink }} />
          {unreadCount ? (
            <Box
              component="span"
              sx={{
                position: "absolute",
                top: unreadCount > 9 ? 1 : 4,
                right: unreadCount > 9 ? -4 : 2,
                minWidth: unreadCount > 9 ? 24 : 17,
                height: 17,
                px: unreadCount > 9 ? 0.5 : 0,
                borderRadius: 9,
                display: "grid",
                placeItems: "center",
                bgcolor: dangerColor,
                color: cutlab.color.softWhite,
                border: `2px solid ${panel}`,
                fontSize: 9,
                fontWeight: 800,
                lineHeight: 1
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Box>
          ) : enabledNotifications.length ? (
            <Box sx={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", bgcolor: accent, border: `1px solid ${panel}` }} />
          ) : null}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={notificationAnchor}
        open={notificationOpen}
        onClose={() => setNotificationAnchor(null)}
        PaperProps={{ sx: { width: 290, bgcolor: panel, color: ink, border: `1px solid ${border}`, boxShadow: "none" } }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>Notifications</Typography>
            {teamData && unreadCount ? (
              <Button
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  markAllNotificationsRead({ teamId: teamData.workspace._id }).catch(() => undefined);
                }}
                sx={{ color: accent, fontSize: 11, fontWeight: 760, p: 0, minWidth: 0 }}
              >
                Mark all read
              </Button>
            ) : null}
          </Stack>
          <Typography sx={{ color: muted, fontSize: 12, mt: 0.25 }}>
            {isConvexAuthLoading ? "Connecting team notifications..." : teamNotificationSyncUnavailable ? "Team notifications are not connected" : teamNotifications.length ? `${unreadCount} unread team notification${unreadCount === 1 ? "" : "s"}` : enabledNotifications.length ? `${enabledNotifications.length} notification types enabled` : "No notifications yet"}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: border }} />
        {isConvexAuthLoading ? (
          <Box sx={{ px: 1.5, py: 1.2 }}>
            <Typography sx={{ color: muted, fontSize: 12, lineHeight: 1.45 }}>Waiting for Convex auth before loading Team notifications.</Typography>
          </Box>
        ) : teamNotificationSyncUnavailable ? (
          <Box sx={{ px: 1.5, py: 1.2 }}>
            <Typography sx={{ color: dangerColor, fontSize: 12, lineHeight: 1.45 }}>Clerk is signed in, but Convex auth is not connected. Check Team sync before relying on shared notifications.</Typography>
          </Box>
        ) : teamNotifications.length ? teamNotifications.slice(0, 8).map((notification) => (
          <MenuItem key={notification._id} sx={{ display: "block", color: ink, py: 1, bgcolor: notification.read ? panel : activeBg }}>
            <Typography sx={{ fontSize: 13, fontWeight: 720 }}>{notification.message}</Typography>
            <Typography sx={{ color: muted, fontSize: 12, mt: 0.25 }}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(notification.createdAt))}</Typography>
            {!notification.read ? (
              <Button
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  markNotificationRead({ notificationId: notification._id }).catch(() => undefined);
                }}
                sx={{ color: accent, fontSize: 11, fontWeight: 760, mt: 0.4, p: 0, minWidth: 0 }}
              >
                Mark read
              </Button>
            ) : null}
          </MenuItem>
        )) : enabledNotifications.length ? enabledNotifications.map(([name]) => (
          <MenuItem key={name} sx={{ display: "block", color: ink, py: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 720 }}>{name}</Typography>
            <Typography sx={{ color: muted, fontSize: 12 }}>{notificationCopy(name)}</Typography>
          </MenuItem>
        )) : (
          <Box sx={{ px: 1.5, py: 1.2 }}>
            <Typography sx={{ color: muted, fontSize: 12, lineHeight: 1.45 }}>Turn on deadline, feedback, or weekly summary notifications from Settings.</Typography>
          </Box>
        )}
      </Menu>
    </>
  );
}

function SettingsPanel({ id, title, subtitle, children }: { id?: string; title: string; subtitle: string; children: React.ReactNode }) {
  const reduceMotion = useHydratedReducedMotion();
  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box id={id} component="section" sx={{ minWidth: 0, p: { xs: 2, md: 2.5 }, border: `1px solid ${border}`, borderRadius: "8px", bgcolor: panel, scrollMarginTop: 76 }}>
        <Box sx={{ display: "grid", minWidth: 0, gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(180px, 0.3fr) minmax(0, 1fr)" }, gap: { xs: 2, xl: 4 } }}>
          <Box>
            <Typography sx={{ color: ink, fontSize: 15, fontWeight: 720 }}>{title}</Typography>
            <Typography sx={{ color: muted, fontSize: 12, mt: 0.5, lineHeight: 1.5, maxWidth: 330 }}>{subtitle}</Typography>
          </Box>
          <Stack gap={1.4} sx={{ minWidth: 0 }}>{children}</Stack>
        </Box>
      </Box>
    </motion.div>
  );
}

function notificationCopy(item: string) {
  const copy: Record<string, string> = {
    "Project updates": "Status changes, notes, and project activity",
    "Feedback received": "When feedback is added to your projects",
    "Upcoming deadlines": "Daily summary of due dates and overdue items",
    Mentions: "When you are mentioned in comments",
    "Weekly summary": "A recap of projects and tasks every Monday"
  };
  return copy[item] ?? "Tracker notification";
}

function SettingsLink({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button size="small" onClick={onClick} sx={{ alignSelf: "flex-start", color: accent, px: 0, fontSize: 13, fontWeight: 720 }}>
      {label}
    </Button>
  );
}

function SegmentedSetting({ label, options, active, onChange }: { label: string; options: string[]; active: string; onChange: (value: string) => void }) {
  return (
    <Box>
      <Typography sx={{ color: muted, fontSize: 12, fontWeight: 680, mb: 1 }}>{label}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, border: `1px solid ${border}`, borderRadius: "6px", overflow: "hidden", maxWidth: 330 }}>
        {options.map((option) => (
          <Button key={option} onClick={() => onChange(option)} sx={{ borderRadius: 0, bgcolor: option === active ? activeBg : panel, color: option === active ? accent : ink, fontSize: 12, fontWeight: 720, borderRight: option === options[options.length - 1] ? 0 : `1px solid ${border}` }}>
            {option}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

function ProfileMetric({ icon, label, sublabel, value }: { icon: React.ReactNode; label: string; sublabel: string; value: string }) {
  return (
    <Box sx={{ px: 2, minHeight: 82 }}>
      <Box sx={{ color: muted, mb: 1, display: "grid", width: 24, placeItems: "center", "& svg": { fontSize: 19 } }}>
        {icon}
      </Box>
      <Typography sx={{ color: ink, fontSize: 24, fontWeight: 680, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ color: ink, fontSize: 12, fontWeight: 720, mt: 0.6 }}>{label}</Typography>
      <Typography sx={{ color: muted, fontSize: 12, mt: 0.2 }}>{sublabel}</Typography>
    </Box>
  );
}

function profileStatusLabel(status: string) {
  if (isDoneStatus(status)) return "Delivered";
  if (status === "In Progress") return "Review";
  if (status === "Planned") return "Scheduled";
  return "Revision";
}

function projectTimelineColor(status: string) {
  if (isDoneStatus(status)) return successColor;
  if (status === "In Progress") return accent;
  if (status === "Planned") return "var(--app-highlight)";
  return warningColor;
}

function profileThumbColor(index: number) {
  return ["#d9e3e8", "#dfd5c7", "#eee7da", "#dce4dc", "#d6e1ed"][index % 5];
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.3, border: `1px solid ${border}`, borderRadius: `${cutlab.radius.sm}px`, bgcolor: softPanel }}>
      <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: 22, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
      <Typography sx={{ color: muted, fontSize: 12, mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}

function EmptyPanel({
  title,
  body,
  assetKey,
  action
}: {
  title: string;
  body: string;
  assetKey?: keyof typeof emptyStateAssets;
  action?: React.ReactNode;
}) {
  const inferredAsset = emptyStateAssets[emptyStateAssetFor(title)];
  const asset = assetKey ? emptyStateAssets[assetKey] : inferredAsset;
  return (
    <Box sx={{ px: 2, py: { xs: 4, md: 5 }, textAlign: "center", display: "grid", justifyItems: "center" }}>
      <Box
        component="img"
        src={asset}
        alt=""
        aria-hidden="true"
        sx={{ width: { xs: 176, sm: 216 }, height: 144, objectFit: "contain", mb: 2, filter: "drop-shadow(0 12px 24px rgba(0,8,12,0.16))" }}
      />
      <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: 16, fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ color: muted, fontSize: 13, lineHeight: 1.55, mt: 0.8, maxWidth: 440 }}>{body}</Typography>
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Box>
  );
}

function ProjectStartDialog({
  open,
  scope,
  onClose,
  onBlank,
  onTemplate,
}: {
  open: boolean;
  scope: "personal" | "team";
  onClose: () => void;
  onBlank: () => void;
  onTemplate: (template: ProjectTemplate) => void;
}) {
  const settings = useTrackerSettings();
  const templates = useMemo(() => [...PROJECT_TEMPLATES, ...(settings.customProjectTemplates ?? [])], [settings.customProjectTemplates]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
      <DialogTitle sx={{ fontSize: 24, fontWeight: 760 }}>Create {scope === "team" ? "Team " : ""}Project</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: muted, fontSize: 13.5, mb: 2 }}>Start clean or prefill a workflow you can edit immediately.</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onBlank}
          sx={{ ...outlineButtonSx, width: "100%", justifyContent: "flex-start", px: 1.5, py: 1.2, mb: 2 }}
        >
          Blank project
        </Button>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
          {templates.map((template) => (
            <Button
              key={template.id}
              variant="outlined"
              onClick={() => onTemplate(template)}
              sx={{
                borderColor: border,
                color: ink,
                borderRadius: "6px",
                p: 1.4,
                minHeight: 92,
                textAlign: "left",
                justifyContent: "flex-start",
                alignItems: "flex-start",
                textTransform: "none",
                "&:hover": { borderColor: accent, bgcolor: activeBg },
              }}
            >
              <Box>
                <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                  <Typography sx={{ fontSize: 14, fontWeight: 760 }}>{template.name}</Typography>
                  {template.custom ? <Chip label="Custom" size="small" sx={{ height: 18, borderRadius: "5px", bgcolor: activeBg, color: accent, fontSize: 10, fontWeight: 760 }} /> : null}
                </Stack>
                <Typography sx={{ color: muted, fontSize: 11.5, lineHeight: 1.45, mt: 0.4 }}>{template.description}</Typography>
              </Box>
            </Button>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: muted }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

function TimecodeChip({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <Chip
      icon={<AccessTimeOutlinedIcon />}
      label={value}
      size="small"
      sx={{
        mt: 0.65,
        height: 23,
        borderRadius: "5px",
        bgcolor: activeBg,
        color: accent,
        fontWeight: 760,
        "& .MuiChip-icon": { color: accent, fontSize: 14 },
      }}
    />
  );
}

function buildClientSummaries(projects: WorkItem[], savedClients: string[] = []) {
  const groups = new Map<string, { name: string; projects: WorkItem[] }>();
  for (const client of savedClients) {
    const clientName = client.trim();
    if (!clientName) continue;
    groups.set(clientName.toLowerCase(), { name: clientName, projects: [] });
  }
  for (const project of projects) {
    const clientName = project.client?.trim();
    if (!clientName) continue;
    const key = clientName.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      groups.set(key, { name: clientName, projects: [project] });
    }
  }

  return [...groups.values()]
    .map(({ name, projects: clientProjects }) => {
      const active = clientProjects.filter((project) => !isDoneStatus(project.status));
      const nextProject = [...active].sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate))[0];
      const latestProject = [...clientProjects].sort((a, b) => createdTime(b) - createdTime(a))[0];
      return {
        name,
        projectCount: clientProjects.length,
        activeCount: active.length,
        nextDue: nextProject?.dueDate || "",
        latestProject: latestProject?.title || ""
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function clientFeedbackStatus(projects: WorkItem[]): "Awaiting" | "Approved" {
  return projects.some((project) => project.status === "In Progress" || project.status === "Planned") ? "Awaiting" : "Approved";
}

function projectProgress(status: string) {
  if (isDoneStatus(status)) return 100;
  if (status === "In Progress") return 60;
  if (status === "Planned") return 25;
  return 10;
}

function projectPriority(project: WorkItem) {
  if (isDoneStatus(project.status)) return "Done";
  if (dueBucket(project) === "Overdue") return "High";
  if (dueBucket(project) === "This Week") return "Med";
  return "Low";
}

function priorityColor(project: WorkItem) {
  const priority = projectPriority(project);
  if (priority === "High") return dangerColor;
  if (priority === "Med") return warningColor;
  if (priority === "Done") return successColor;
  return muted;
}

function projectThumbColor(seed: string) {
  const colors = ["#d9e3e8", "#dfd5c7", "#eee7da", "#dce4dc", "#d6e1ed", "#eadfd8"];
  const index = Math.abs(seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0)) % colors.length;
  return colors[index];
}

function ClientInfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ color: muted, minWidth: 0 }}>
      <Box sx={{ width: 20, display: "grid", placeItems: "center", flexShrink: 0, "& svg": { fontSize: 17 } }}>{icon}</Box>
      <Typography noWrap sx={{ color: muted, fontSize: 13 }}>{text}</Typography>
    </Stack>
  );
}

function LabeledControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={0.8}>
      <Typography sx={{ color: muted, fontSize: 12, fontWeight: 680 }}>{label}</Typography>
      {children}
    </Stack>
  );
}

function StatCard({ label, value, helper, progress, tone, icon }: { label: string; value: string; helper: string; progress?: number; tone?: "accent"; icon?: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: 98, bgcolor: "transparent", borderTop: `2px solid ${tone === "accent" ? accent : border}`, px: 0, py: 1.5 }}>
      <Stack direction="row" alignItems="center" gap={1.4}>
        {icon ? (
          <Box sx={{ width: 38, height: 38, borderRadius: `${cutlab.radius.xs}px`, display: "grid", placeItems: "center", color: tone === "accent" ? accent : muted, bgcolor: tone === "accent" ? activeBg : "transparent", flexShrink: 0, "& svg": { fontSize: 22 } }}>
            {icon}
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ color: muted, fontSize: 13, fontWeight: 700, mb: 0.6 }}>{label}</Typography>
          <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: 30, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
          <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.7 }}>{helper}</Typography>
        </Box>
      </Stack>
      {typeof progress === "number" ? (
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 1.5, height: 5, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
      ) : null}
    </Box>
  );
}

function DashboardSection({
  title,
  subtitle,
  action,
  children,
  sx,
  compact = false
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: Record<string, unknown>;
  compact?: boolean;
}) {
  return (
    <Box component="section" sx={{ py: compact ? 1.5 : 2.25, borderTop: `1px solid ${border}`, ...sx }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ pb: compact ? 1 : 1.5 }}>
        <Box>
          <Typography sx={{ color: ink, fontSize: compact ? 15 : 18, fontWeight: 760 }}>{title}</Typography>
          <Typography sx={{ color: muted, fontSize: compact ? 11.5 : 12.5, mt: compact ? 0.15 : 0.35 }}>{subtitle}</Typography>
        </Box>
        {action}
      </Stack>
      <Box>{children}</Box>
    </Box>
  );
}

function WorkflowPipeline({
  stages,
  activeStage,
  onSelect,
  compact = false
}: {
  stages: DashboardPipelineItem[];
  activeStage: DashboardPipelineStage | "All";
  onSelect: (stage: DashboardPipelineStage) => void;
  compact?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        pb: 0.4,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" }
      }}
    >
      {stages.map((stage, index) => {
        const active = activeStage === stage.key;
        return (
          <Box key={stage.key} sx={{ display: "flex", alignItems: "center", minWidth: { xs: compact ? 150 : 210, md: 0 }, flex: { md: 1 } }}>
            <Button
              onClick={() => onSelect(stage.key)}
              aria-pressed={active}
              sx={{
                width: "100%",
                minHeight: compact ? 72 : 112,
                display: "block",
                textAlign: "left",
                p: compact ? 1.05 : 1.5,
                border: 0,
                borderTop: `2px solid ${active ? accent : border}`,
                bgcolor: active ? activeBg : "transparent",
                color: ink,
                borderRadius: 0,
                "&:hover": { bgcolor: active ? activeBg : hoverBg }
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ color: active ? accent : muted, fontSize: 10, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase" }}>0{index + 1}</Typography>
                <Typography sx={{ color: muted, fontSize: 11 }}>{stage.percent}%</Typography>
              </Stack>
              <Stack direction="row" alignItems="baseline" gap={0.8} sx={{ mt: compact ? 0.55 : 1 }}>
                <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: compact ? 23 : 30, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{stage.count}</Typography>
                <Typography sx={{ color: ink, fontSize: compact ? 11.5 : 13, fontWeight: 720 }}>{stage.key}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={stage.percent} sx={{ height: 3, mt: compact ? 0.7 : 1.2, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: active ? accent : muted } }} />
            </Button>
          {index < stages.length - 1 ? <ChevronRightIcon sx={{ color: border, mx: 0.15, flexShrink: 0 }} /> : null}
          </Box>
        );
      })}
    </Box>
  );
}

function UpcomingDeliveries({
  projects,
  settings,
  onViewProject,
  onNewProject,
  compact = false
}: {
  projects: WorkItem[];
  settings: SettingsState;
  onViewProject: (project: WorkItem) => void;
  onNewProject: () => void;
  compact?: boolean;
}) {
  if (!projects.length) {
    return compact ? (
      <CompactDashboardEmpty
        title="No upcoming deliveries"
        body="Active project deadlines will appear here."
        assetKey="schedule"
        action={<Button size="small" onClick={onNewProject} sx={{ color: accent, fontWeight: 720 }}>Add Project</Button>}
      />
    ) : (
      <EmptyPanel title="No upcoming deliveries" body="Projects with active due dates will appear here in deadline order." assetKey="schedule" action={<Button variant="outlined" startIcon={<AddIcon />} onClick={onNewProject} sx={outlineButtonSx}>Add Project</Button>} />
    );
  }

  return (
    <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
      {projects.slice(0, compact ? 3 : 6).map((project) => {
        const urgency = deliveryUrgency(project.dueDate);
        return (
          <Stack key={project.id} direction="row" alignItems="center" gap={compact ? 0.8 : 1.2} sx={{ py: compact ? 0.65 : 1.2, "&:first-of-type": { pt: 0 }, "&:last-of-type": { pb: 0 } }}>
            <Box sx={{ width: compact ? 64 : 82, flexShrink: 0 }}>
              <Typography sx={{ color: urgency.color, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.45 }}>{urgency.label}</Typography>
              <Typography noWrap sx={{ color: muted, fontSize: 10.5, mt: 0.1 }}>{formatDate(project.dueDate, settings.dateFormat)}</Typography>
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ color: ink, fontSize: compact ? 12.5 : 14, fontWeight: 760 }}>{project.title}</Typography>
              <Typography noWrap sx={{ color: muted, fontSize: compact ? 10.5 : 12, mt: 0.1 }}>{project.client || project.workType}</Typography>
            </Box>
            {!compact ? <StatusChip status={project.status} /> : null}
            <Button size="small" onClick={() => onViewProject(project)} sx={{ color: accent, fontWeight: 720, minWidth: 0, px: 0.6 }}>View</Button>
          </Stack>
        );
      })}
    </Stack>
  );
}

function SalaryBatchProgress({
  progress,
  size,
  percentage,
  amount,
  currency
}: {
  progress: number;
  size: number;
  percentage: number;
  amount: number;
  currency: string;
}) {
  const complete = progress >= size;
  const remaining = Math.max(0, size - progress);
  return (
    <Stack sx={{ minHeight: 200, justifyContent: "space-between" }}>
      <Box>
        <Typography sx={{ color: muted, fontSize: 11, fontWeight: 800, letterSpacing: 0.55, textTransform: "uppercase", mb: 0.8 }}>Salary Edits Done</Typography>
        <Stack direction="row" alignItems="baseline" gap={0.7}>
          <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: 42, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{progress}</Typography>
          <Typography sx={{ color: muted, fontSize: 17, fontWeight: 650 }}>/ {size} edits</Typography>
        </Stack>
        <Typography sx={{ color: complete ? successColor : muted, fontSize: 13, mt: 1 }}>{complete ? "Batch ready for payout" : `${remaining} edit${remaining === 1 ? "" : "s"} remaining`}</Typography>
      </Box>
      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
          <Typography sx={{ color: muted, fontSize: 12 }}>Current batch</Typography>
          <Typography sx={{ color: ink, fontSize: 12, fontWeight: 760 }}>{percentage}%</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={percentage} sx={{ height: 8, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: complete ? successColor : accent } }} />
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.4 }}>
          <Typography sx={{ color: muted, fontSize: 12 }}>Payout</Typography>
          <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{money(amount, currency)}</Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

function UnifiedOperationsMetrics({
  metrics,
  progress,
  size,
  percentage,
  amount,
  currency
}: {
  metrics: Array<{ label: string; value: string; helper: string; icon: React.ReactNode; accent?: boolean }>;
  progress: number;
  size: number;
  percentage: number;
  amount: number;
  currency: string;
}) {
  const complete = progress >= size;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr)) minmax(250px, 1.35fr)" }, borderTop: `1px solid ${border}` }}>
      {metrics.map((metric) => (
        <Box key={metric.label} sx={{ minWidth: 0, px: { xs: 1, md: 1.5 }, py: 1.5, bgcolor: metric.accent ? activeBg : "transparent", borderRight: { md: `1px solid ${border}` }, borderBottom: { xs: `1px solid ${border}`, md: 0 } }}>
          <Stack direction="row" alignItems="center" gap={0.65}>
            <Box sx={{ color: metric.accent ? accent : muted, display: "grid", "& svg": { fontSize: 16 } }}>{metric.icon}</Box>
            <Typography noWrap sx={{ color: muted, fontSize: 10.5, fontWeight: 760 }}>{metric.label}</Typography>
          </Stack>
          <Typography noWrap sx={{ color: ink, fontFamily: headingFont, fontSize: 22, fontWeight: 700, lineHeight: 1, mt: 0.7, fontVariantNumeric: "tabular-nums" }}>{metric.value}</Typography>
          <Typography noWrap sx={{ color: muted, fontSize: 10.5, mt: 0.4 }}>{metric.helper}</Typography>
        </Box>
      ))}
      <Box sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1", xl: "auto" }, px: 1.5, py: 1.5, bgcolor: "transparent" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Box>
            <Typography sx={{ color: muted, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.45, textTransform: "uppercase" }}>Salary Edits Done</Typography>
            <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: 22, fontWeight: 700, mt: 0.35, lineHeight: 1 }}>
              {progress} <Box component="span" sx={{ color: muted, fontFamily: "inherit", fontSize: 12, fontWeight: 650 }}>/ {size}</Box>
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: complete ? successColor : accent, fontSize: 12, fontWeight: 780 }}>{percentage}%</Typography>
            <Typography sx={{ color: muted, fontSize: 10.5, mt: 0.2 }}>{money(amount, currency)} payout</Typography>
          </Box>
        </Stack>
        <LinearProgress variant="determinate" value={percentage} sx={{ height: 5, borderRadius: 99, mt: 0.9, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: complete ? successColor : accent } }} />
        <Typography sx={{ color: complete ? successColor : muted, fontSize: 10.5, mt: 0.55 }}>{complete ? "Batch ready" : `${Math.max(0, size - progress)} remaining`}</Typography>
      </Box>
    </Box>
  );
}

function CompactDashboardEmpty({
  title,
  body,
  assetKey,
  action
}: {
  title: string;
  body: string;
  assetKey: keyof typeof emptyStateAssets;
  action?: React.ReactNode;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1.2} sx={{ minHeight: 74 }}>
      <Box component="img" src={emptyStateAssets[assetKey]} alt="" aria-hidden="true" sx={{ width: 78, height: 62, objectFit: "contain", flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ color: ink, fontSize: 12.5, fontWeight: 760 }}>{title}</Typography>
        <Typography sx={{ color: muted, fontSize: 10.5, lineHeight: 1.35, mt: 0.2 }}>{body}</Typography>
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Stack>
  );
}

function DashboardActivityFeed({
  activity,
  projects,
  emptyAsset,
  compact = false
}: {
  activity: DashboardActivity[];
  projects: WorkItem[];
  emptyAsset: keyof typeof emptyStateAssets;
  compact?: boolean;
}) {
  if (!activity.length) {
    return compact
      ? <CompactDashboardEmpty title="No recent activity" body="Actions will appear here as work moves forward." assetKey={emptyAsset} />
      : <EmptyPanel title="No recent activity" body="Project and workspace actions will appear here as work moves forward." assetKey={emptyAsset} />;
  }

  return (
    <Stack divider={<Divider flexItem sx={{ borderColor: border }} />}>
      {activity.slice(0, compact ? 4 : 6).map((item) => {
        const project = item.projectId ? projects.find((candidate) => candidate.id === item.projectId) : undefined;
        return (
          <Stack key={item.id} direction="row" gap={compact ? 0.8 : 1.2} sx={{ py: compact ? 0.6 : 1.1, "&:first-of-type": { pt: 0 }, "&:last-of-type": { pb: 0 } }}>
            <Box sx={{ width: compact ? 26 : 32, height: compact ? 26 : 32, borderRadius: "5px", bgcolor: item.kind === "delivered" ? "var(--app-success-bg)" : activeBg, color: item.kind === "delivered" ? successColor : accent, display: "grid", placeItems: "center", flexShrink: 0 }}>
              {item.kind === "delivered" ? <CheckCircleOutlineIcon sx={{ fontSize: compact ? 15 : 18 }} /> : item.kind === "team" ? <PeopleAltOutlinedIcon sx={{ fontSize: compact ? 15 : 18 }} /> : item.kind === "updated" ? <EditOutlinedIcon sx={{ fontSize: compact ? 15 : 18 }} /> : <ViewTimelineOutlinedIcon sx={{ fontSize: compact ? 15 : 18 }} />}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap={compact} sx={{ color: ink, fontSize: compact ? 12 : 13, fontWeight: 700, lineHeight: 1.3 }}>{item.message}</Typography>
              <Typography noWrap sx={{ color: muted, fontSize: compact ? 10.5 : 11.5, mt: compact ? 0.15 : 0.35 }}>
                {[item.actor, project?.title, relativeActivityTime(item.createdAt)].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

function DashboardActivitySkeleton() {
  return (
    <Stack gap={1.4}>
      {[0, 1, 2].map((item) => (
        <Stack key={item} direction="row" gap={1.2}>
          <Skeleton variant="rounded" width={32} height={32} sx={{ bgcolor: softPanel }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="78%" height={18} sx={{ bgcolor: softPanel }} />
            <Skeleton width="46%" height={15} sx={{ bgcolor: softPanel }} />
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

function MetricStrip({ metrics }: { metrics: Array<{ label: string; value: string; helper: string; icon: React.ReactNode; accent?: boolean }> }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${metrics.length}, minmax(0, 1fr))` }, borderTop: `1px solid ${border}` }}>
      {metrics.map((metric, index) => (
        <Box
          key={metric.label}
          sx={{
            minWidth: 0,
            px: { xs: 1.5, lg: 2 },
            py: 1.75,
            bgcolor: metric.accent ? activeBg : "transparent",
            borderRight: { md: index === metrics.length - 1 ? 0 : `1px solid ${border}` },
            borderBottom: { xs: index < metrics.length - 2 ? `1px solid ${border}` : 0, md: 0 },
            "&:last-of-type": { gridColumn: { xs: metrics.length % 2 ? "1 / -1" : "auto", md: "auto" } }
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ color: metric.accent ? accent : muted, display: "grid", placeItems: "center", "& svg": { fontSize: 20 } }}>{metric.icon}</Box>
            <Typography noWrap sx={{ color: muted, fontSize: 12, fontWeight: 700 }}>{metric.label}</Typography>
          </Stack>
          <Typography sx={{ color: ink, fontFamily: headingFont, fontSize: 27, fontWeight: 700, lineHeight: 1, mt: 1, fontVariantNumeric: "tabular-nums" }}>{metric.value}</Typography>
          <Typography noWrap sx={{ color: muted, fontSize: 11.5, mt: 0.6 }}>{metric.helper}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function CompactSelect({ value, options, labels, onChange, width = 104 }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void; width?: number | string | Record<string, number | string> }) {
  const normalizedOptions = [...new Set(options.filter((option) => option.trim()))];
  if (value && !normalizedOptions.includes(value)) normalizedOptions.unshift(value);

  return (
    <FormControl size="small" sx={{ width, minWidth: width }}>
      <Select
        value={value}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
        renderValue={(selected) => labels?.[selected as string] ?? selected}
        sx={{
          height: 33,
          borderRadius: "5px",
          color: ink,
          fontSize: 13,
          bgcolor: panel,
          "& .MuiSelect-select": { pr: "26px !important" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: accent },
          "& svg": { color: muted }
        }}
      >
        {normalizedOptions.map((option) => (
          <MenuItem key={option} value={option}>{labels?.[option] ?? option}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function ProjectTableHeader() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr) auto",
          lg: "minmax(240px, 1.6fr) minmax(90px, 0.7fr) 100px 100px minmax(100px, 0.7fr) 120px 96px"
        },
        gap: 2,
        px: 2,
        py: 1.1,
        bgcolor: "transparent",
        borderTop: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`
      }}
    >
      {["Project", "Type", "Due Date", "Status", "Amount", "Progress", ""].map((heading) => (
        <Typography key={heading || "actions"} sx={{ display: { xs: heading ? "none" : "block", lg: "block" }, color: muted, fontSize: 11, fontWeight: 760, textTransform: "uppercase" }}>{heading}</Typography>
      ))}
    </Box>
  );
}

function ProjectRow({ project, canEdit, canDelete, onView, onEdit, onDelete }: { project: WorkItem; canEdit: boolean; canDelete: boolean; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const settings = useTrackerSettings();
  const amount = isSalaryWorkType(project.workType, settings) ? "Batch tracked" : money(project.earnings, settings.currencyCode);
  const progress = projectProgress(project.status);

  return (
    <Box
      role="button"
      data-testid="project-row"
      data-project-title={project.title}
      tabIndex={0}
      aria-label={`View details for ${project.title}`}
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView();
        }
      }}
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr) auto",
          lg: "minmax(240px, 1.6fr) minmax(90px, 0.7fr) 100px 100px minmax(100px, 0.7fr) 120px 96px"
        },
        gap: 2,
        alignItems: "center",
        px: 2,
        py: 1.5,
        bgcolor: "transparent",
        cursor: "pointer",
        outline: "none",
        transition: "background-color 140ms ease",
        "&:hover": { bgcolor: hoverBg },
        "&:focus-visible": { boxShadow: `inset 0 0 0 2px ${accent}` }
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.4} sx={{ minWidth: 0 }}>
        <Box sx={{ display: { xs: "none", sm: "block" }, width: 78, height: 48, flexShrink: 0, borderRadius: "6px", border: `1px solid ${border}`, bgcolor: projectThumbColor(project.id), position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", left: 10, right: 10, bottom: 10, height: 3, borderRadius: 99, bgcolor: "rgba(91,63,160,0.35)" }} />
          <Box sx={{ position: "absolute", left: 20, right: 24, bottom: 10, height: 3, borderRadius: 99, bgcolor: accent }} />
          <MovieCreationOutlinedIcon sx={{ position: "absolute", right: 9, top: 8, color: thumbIcon, fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{project.title}</Typography>
          <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.4 }}>{project.client ? `${project.client} · ${project.notes || "No notes"}` : project.notes || "No project notes"}</Typography>
          <Box sx={{ display: { xs: "block", lg: "none" }, mt: 1 }}>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 5, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
          </Box>
        </Box>
      </Stack>
      <Typography sx={{ display: { xs: "none", lg: "block" }, color: ink, fontSize: 13, fontWeight: 650 }}>{project.workType}</Typography>
      <Box sx={{ display: { xs: "none", lg: "block" } }}>
        <Typography sx={{ color: ink, fontSize: 13 }}>{formatDate(project.dueDate, settings.dateFormat)}</Typography>
      </Box>
      <Box sx={{ display: { xs: "none", lg: "block" } }}>
        <StatusChip status={project.status} />
      </Box>
      <Typography sx={{ display: { xs: "none", lg: "block" }, color: ink, fontSize: 13, fontWeight: 650 }}>{amount}</Typography>
      <Box sx={{ display: { xs: "none", lg: "block" } }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography sx={{ color: muted, fontSize: 12 }}>{progress}%</Typography>
          <Typography sx={{ color: priorityColor(project), fontSize: 12, fontWeight: 720 }}>{projectPriority(project)}</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 5, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
      </Box>
      <Stack direction="row" gap={0.5} justifyContent="flex-end" sx={{ flexShrink: 0 }}>
        <Tooltip title={canEdit ? "Edit project" : "Your role can view this project only"}>
          <Button size="small" aria-label={`Edit ${project.title}`} disabled={!canEdit} onClick={(event) => { event.stopPropagation(); onEdit(); }} onKeyDown={(event) => event.stopPropagation()} sx={{ minWidth: 34, width: 34, height: 34, color: muted, p: 0 }}>
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </Button>
        </Tooltip>
        <Tooltip title={canDelete ? "Delete project" : "Only project owners or team owners can delete this project"}>
          <Button size="small" aria-label={`Delete ${project.title}`} disabled={!canDelete} onClick={(event) => { event.stopPropagation(); onDelete(); }} onKeyDown={(event) => event.stopPropagation()} sx={{ minWidth: 34, width: 34, height: 34, color: dangerColor, p: 0 }}>
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );
}



function deadlineColor(status: string) {
  if (status === "In Progress") return warningColor;
  if (status === "Cancelled") return dangerColor;
  return accent;
}

function dueBucket(project: WorkItem): DueFilter {
  if (isDoneStatus(project.status)) return "Delivered";
  const due = new Date(`${project.dueDate}T00:00:00`);
  const today = todayDate();
  if (due.getTime() < today.getTime()) return "Overdue";
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return due.getTime() <= weekEnd.getTime() ? "This Week" : "ALL";
}

function dashboardProjectStage(project: WorkItem): DashboardPipelineStage | null {
  if (isDoneStatus(project.status)) return "Delivered";
  if (project.status === "Cancelled") return null;
  if (project.status === "Planned") return "Planning";
  const reviewText = `${project.status} ${project.notes}`.toLowerCase();
  if (["review", "feedback", "revision", "approval", "changes requested"].some((term) => reviewText.includes(term))) return "Review";
  return "In Progress";
}

function dashboardPipeline(projects: WorkItem[]): DashboardPipelineItem[] {
  const stages: DashboardPipelineStage[] = ["Planning", "In Progress", "Review", "Delivered"];
  const total = Math.max(1, projects.filter((project) => dashboardProjectStage(project) !== null).length);
  return stages.map((key) => {
    const count = projects.filter((project) => dashboardProjectStage(project) === key).length;
    return { key, count, percent: Math.round((count / total) * 100) };
  });
}

function dashboardUpcomingDeliveries(projects: WorkItem[]) {
  return projects
    .filter((project) => !isDoneStatus(project.status) && project.status !== "Cancelled" && isIsoDate(project.dueDate))
    .sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate));
}

function deliveryUrgency(dueDate: string) {
  const due = dateTime(dueDate);
  const today = todayDate().getTime();
  const tomorrow = addDays(todayDate(), 1).getTime();
  if (due < today) return { label: "Overdue", color: dangerColor };
  if (due === today) return { label: "Today", color: dangerColor };
  if (due === tomorrow) return { label: "Tomorrow", color: warningColor };
  return { label: "Upcoming", color: accent };
}

function dashboardProjectActivity(projects: WorkItem[], sessionActivity: DashboardActivity[]) {
  const sessionProjectKeys = new Set(sessionActivity.map((item) => `${item.kind}:${item.projectId || ""}`));
  const savedActivity: DashboardActivity[] = projects
    .filter((project) => project.createdAt && !sessionProjectKeys.has(`created:${project.id}`))
    .map((project) => ({
      id: `created-${project.id}`,
      kind: "created",
      message: `${project.title} was created`,
      projectId: project.id,
      createdAt: project.createdAt as string
    }));

  return [...sessionActivity, ...savedActivity]
    .filter((item) => Number.isFinite(Date.parse(item.createdAt)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 20);
}

function relativeActivityTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function calendarMonthDays(month: Date, weekStart: string) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  const startIndex = weekdayIndex(weekStart);
  const offset = (first.getDay() - startIndex + 7) % 7;
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function orderedWeekdays(weekStart: string) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = weekdayIndex(weekStart);
  return [...days.slice(start), ...days.slice(0, start)];
}

function weekdayIndex(day: string) {
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
  return index >= 0 ? index : 1;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function statusPalette(status: string) {
  if (isDoneStatus(status)) return { fg: "var(--app-success, #23B58E)", bg: "var(--app-success-bg, rgba(35,181,142,0.14))" };
  if (status === "In Progress") return { fg: "var(--app-warning, #F5A623)", bg: "var(--app-warning-bg, rgba(245,166,35,0.14))" };
  if (status === "Cancelled") return { fg: "var(--app-danger, #FF5B5B)", bg: "var(--app-danger-bg, rgba(255,91,91,0.14))" };
  return { fg: accent, bg: activeBg };
}

function statusFg(status: string) {
  return statusPalette(status).fg;
}

function statusBg(status: string) {
  return statusPalette(status).bg;
}

function StatusChip({ status }: { status: string }) {
  const palette = statusPalette(status);

  return (
    <Chip
      label={status}
      size="small"
      sx={{
        height: 24,
        flexShrink: 0,
        bgcolor: palette.bg,
        color: palette.fg,
        borderRadius: "5px",
        fontSize: 12,
        fontWeight: 720
      }}
    />
  );
}

function checklistItemKey(item: string, index: number) {
  return `${index}:${item.trim()}`.slice(0, 160);
}

function normalizeChecklistCompleted(items: string[] = [], completed: Record<string, boolean> = {}) {
  const allowedKeys = new Set(items.map((item, index) => checklistItemKey(item, index)));
  return Object.fromEntries(Object.entries(completed).filter(([key, value]) => allowedKeys.has(key) && value === true));
}

function ProjectDetailDialog({ project, settings, canEdit, canDelete, canUpdateStatus, canComment, teamMembers, localActivity, onClose, onEdit, onDelete, onStatusChange, onChecklistChange, onPaymentChange }: { project: WorkItem | null; settings: SettingsState; canEdit: boolean; canDelete: boolean; canUpdateStatus: boolean; canComment: boolean; teamMembers: WorkspaceMemberOption[]; localActivity: ProjectActivityEvent[]; onClose: () => void; onEdit: (project: WorkItem) => void; onDelete: (project: WorkItem) => void; onStatusChange: (project: WorkItem, status: ProjectStatus) => void; onChecklistChange: (project: WorkItem, itemKey: string, completed: boolean) => void; onPaymentChange: (project: WorkItem, paid: boolean) => void }) {
  if (!project) {
    return null;
  }

  const progress = projectProgress(project.status);
  const isClientBillable = !isSalaryWorkType(project.workType, settings) && isDoneStatus(project.status) && safeMoneyValue(project.earnings) > 0;
  const amount = isSalaryWorkType(project.workType, settings) ? "Batch tracked" : money(project.earnings, settings.currencyCode);
  const configuredLinks = integrationServices
    .map((service) => ({ service, link: project.integrationLinks?.[service.id] }))
    .filter(({ link }) => hasIntegrationLink(link));
  const assignedMembers = teamMembers.filter((member) => (project.assigneeUserIds ?? []).includes(member.userId));
  const checklistItems = project.checklistItems ?? [];
  const checklistCompleted = normalizeChecklistCompleted(checklistItems, project.checklistCompleted);
  const checklistDone = checklistItems.filter((item, index) => checklistCompleted[checklistItemKey(item, index)]).length;
  const deliverableTargets = project.templateDeliverables ?? [];

  function openLink(url: string) {
    if (typeof window === "undefined" || !isValidIntegrationUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog
      open
      data-testid="project-detail-dialog"
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          width: { xs: "calc(100% - 16px)", md: "calc(100% - 48px)" },
          height: { xs: "calc(100dvh - 16px)", md: "min(920px, calc(100dvh - 48px))" },
          maxHeight: "none",
          bgcolor: panel,
          color: ink,
          border: `1px solid ${border}`,
          borderRadius: { xs: "8px", md: "12px" },
          overflow: "hidden"
        }
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} sx={{ px: { xs: 2, md: 3 }, py: 2.2, borderBottom: `1px solid ${border}` }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.9, flexWrap: "wrap" }}>
              <StatusChip status={project.status} />
              <Chip label={project.workType} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px", fontWeight: 720 }} />
              {configuredLinks.length ? <Chip label={`${configuredLinks.length} links`} size="small" sx={{ bgcolor: softPanel, color: muted, borderRadius: "5px", fontWeight: 720 }} /> : null}
            </Stack>
            <Typography sx={{ color: ink, fontSize: { xs: 24, md: 30 }, fontWeight: 760, lineHeight: 1.1 }}>{project.title}</Typography>
            <Typography sx={{ color: muted, fontSize: 13, mt: 0.7 }}>{project.client || "No client saved"}</Typography>
          </Box>
          <Button aria-label="Close project details" onClick={onClose} sx={{ minWidth: 34, width: 34, height: 34, color: muted, p: 0 }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 360px" }, height: "100%", minHeight: 0 }}>
          <Box sx={{ minWidth: 0, overflowY: "auto", px: { xs: 2, md: 3 }, py: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.2, mb: 2 }}>
              <ProjectDetailMetric label="Start" value={formatDate(project.startDate, settings.dateFormat)} />
              <ProjectDetailMetric label="Due" value={formatDate(project.dueDate, settings.dateFormat)} />
              <ProjectDetailMetric label="Amount" value={amount} />
              <ProjectDetailMetric label="Payment" value={isClientBillable ? (project.paid ? "Paid" : "Unpaid") : "Not billable"} />
            </Box>
            <Paper sx={{ ...panelSx, p: 2, mb: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1.2} sx={{ mb: 1.4 }}>
                <Box>
                  <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Workflow Progress</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.3 }}>{progress}% complete · {projectPriority(project)}</Typography>
                </Box>
                {canUpdateStatus ? <CompactSelect value={project.status} options={statusOptions} onChange={(status) => onStatusChange(project, status as ProjectStatus)} width={{ xs: "100%", sm: 180 }} /> : <StatusChip status={project.status} />}
              </Stack>
              <ProjectStageTracker status={project.status} />
            </Paper>
            {(checklistItems.length || deliverableTargets.length) ? (
              <Paper sx={{ ...panelSx, p: 2, mb: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1.2} sx={{ mb: 1.4 }}>
                  <Box>
                    <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Template setup</Typography>
                    <Typography sx={{ color: muted, fontSize: 12, mt: 0.3 }}>
                      {checklistItems.length ? `${checklistDone}/${checklistItems.length} checklist items complete` : "Suggested deliverables for this workflow"}
                    </Typography>
                  </Box>
                  {checklistItems.length ? <Chip label={`${Math.round((checklistDone / checklistItems.length) * 100)}%`} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px", fontWeight: 760 }} /> : null}
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: checklistItems.length && deliverableTargets.length ? "minmax(0, 1fr) minmax(240px, 0.8fr)" : "1fr" }, gap: 1.2 }}>
                  {checklistItems.length ? (
                    <Stack gap={0.7}>
                      {checklistItems.map((item, index) => {
                        const itemKey = checklistItemKey(item, index);
                        const checked = Boolean(checklistCompleted[itemKey]);
                        return (
                          <Stack key={itemKey} direction="row" alignItems="center" gap={1} sx={{ p: 0.9, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: checked ? activeBg : softPanel }}>
                            <Switch size="small" checked={checked} disabled={!canEdit} inputProps={{ "aria-label": `${checked ? "Mark incomplete" : "Mark complete"}: ${item}` }} onChange={(event) => onChecklistChange(project, itemKey, event.target.checked)} />
                            <Typography sx={{ color: checked ? muted : ink, fontSize: 13, lineHeight: 1.45, textDecoration: checked ? "line-through" : "none" }}>{item}</Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  ) : null}
                  {deliverableTargets.length ? (
                    <Stack gap={0.7}>
                      {deliverableTargets.map((deliverable, index) => (
                        <Stack key={`${deliverable.title}-${index}`} direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ p: 0.9, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: softPanel }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{deliverable.title}</Typography>
                            <Typography sx={{ color: muted, fontSize: 11.5, mt: 0.25 }}>{deliverable.category}</Typography>
                          </Box>
                          <Chip label={APPROVAL_STATUS_LABELS[deliverable.initialStatus] ?? deliverable.initialStatus} size="small" sx={{ bgcolor: panel, color: muted, borderRadius: "5px" }} />
                        </Stack>
                      ))}
                    </Stack>
                  ) : null}
                </Box>
              </Paper>
            ) : null}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.25fr) minmax(260px, 0.75fr)" }, gap: 2 }}>
              <Paper sx={{ ...panelSx, p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Internal Notes</Typography>
                  {canEdit ? <Button onClick={() => onEdit(project)} size="small" sx={{ color: accent }}>Edit</Button> : null}
                </Stack>
                <Typography sx={{ color: project.notes ? ink : muted, fontSize: 13, mt: 1, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {project.notes || "No internal notes saved. Add production context, handoff details, or private reminders."}
                </Typography>
              </Paper>
              <Paper sx={{ ...panelSx, p: 2 }}>
                <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Project Metadata</Typography>
                <Stack divider={<Divider flexItem sx={{ borderColor: border }} />} sx={{ mt: 1 }}>
                  <ProjectMetadataRow label="Client" value={project.client || "Not assigned"} />
                  <ProjectMetadataRow label="Type" value={project.workType} />
                  <ProjectMetadataRow label="Workspace" value={project.teamId ? "Team workspace" : "Personal workspace"} />
                  <ProjectMetadataRow label="Created" value={project.createdAt ? formatShortDateTime(project.createdAt) : "Not recorded"} />
                  <ProjectMetadataRow label="Team members" value={project.teamId ? (assignedMembers.length ? assignedMembers.map((member) => member.name || member.email).join(", ") : "Unassigned") : "You"} />
                </Stack>
              </Paper>
            </Box>
            <Paper sx={{ ...panelSx, p: 2, mt: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1.2}>
                <Box>
                  <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Client Payment</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.3 }}>Tracks whether delivered billable work has been collected. Payment collection integrations are not connected here.</Typography>
                </Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Chip label={isClientBillable ? (project.paid ? "Paid" : "Unpaid") : "Not billable"} size="small" sx={{ bgcolor: project.paid ? activeBg : isClientBillable ? softPanel : softPanel, color: project.paid ? successColor : isClientBillable ? warningColor : muted, borderRadius: "5px", fontWeight: 760 }} />
                  <Switch size="small" checked={Boolean(project.paid)} disabled={!canEdit || !isClientBillable} inputProps={{ "aria-label": `${project.paid ? "Mark unpaid" : "Mark paid"}: ${project.title}` }} onChange={(event) => onPaymentChange(project, event.target.checked)} />
                </Stack>
              </Stack>
              {project.paidDate ? <Typography sx={{ color: muted, fontSize: 11.5, mt: 1 }}>Marked paid {formatShortDateTime(project.paidDate)}.</Typography> : null}
            </Paper>
            <Paper sx={{ ...panelSx, p: 2, mt: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                <Box>
                  <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Resources & Assets</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.3 }}>Working files, review links, exports, and linked folders.</Typography>
                </Box>
                <Chip label={configuredIntegrationCount(project.integrationLinks)} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px" }} />
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
                {configuredLinks.length ? configuredLinks.map(({ service, link }) => link ? (
                  <Box key={service.id} sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: softPanel }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{integrationDisplayText(link, service.name)}</Typography>
                        <Typography noWrap sx={{ color: muted, fontSize: 12, mt: 0.3 }}>{service.name}</Typography>
                      </Box>
                      <Tooltip title={`Open ${service.name}`}>
                        <Button aria-label={`Open ${service.name} link`} onClick={() => openLink(link.url)} sx={{ minWidth: 34, width: 34, height: 34, color: accent, p: 0 }}>
                          <OpenInNewIcon sx={{ fontSize: 18 }} />
                        </Button>
                      </Tooltip>
                    </Stack>
                    {link.notes ? <Typography sx={{ color: muted, fontSize: 12, mt: 0.8, lineHeight: 1.45 }}>{link.notes}</Typography> : null}
                  </Box>
                ) : null) : (
                  <Typography sx={{ color: muted, fontSize: 13 }}>No project links saved yet. Use Edit Project to connect working files and review links.</Typography>
                )}
              </Box>
            </Paper>
            <ProjectFileManager project={project} canEdit={canEdit} />
            <ProjectDetailCollaborationPanel project={project} teamMembers={teamMembers} canComment={canComment} />
            <ClientPortalManager project={project} canEdit={canEdit} />
          </Box>
          <ProjectActivityFeed project={project} localActivity={localActivity} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, md: 3 }, py: 2, borderTop: `1px solid ${border}` }}>
        {canDelete ? <Button onClick={() => onDelete(project)} sx={{ color: dangerColor }}>Delete</Button> : null}
        {canEdit ? <Button onClick={() => onEdit(project)} variant="outlined" sx={outlineButtonSx}>Edit Project</Button> : <Typography sx={{ color: muted, fontSize: 13 }}>Your team role can view this project but cannot edit it.</Typography>}
      </DialogActions>
    </Dialog>
  );
}

function ProjectDetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <Paper sx={{ ...panelSx, p: 1.6 }}>
      <Typography sx={{ color: muted, fontSize: 11, fontWeight: 760, textTransform: "uppercase" }}>{label}</Typography>
      <Typography sx={{ color: ink, fontSize: 15, fontWeight: 760, mt: 0.6 }}>{value}</Typography>
    </Paper>
  );
}

function ProjectStageTracker({ status }: { status: string }) {
  const stages = ["Planned", "In Progress", "Review", "Delivered"];
  const currentStage = clientPortalStage(status);
  const currentIndex = stages.indexOf(currentStage);

  return (
    <Box>
      <LinearProgress variant="determinate" value={Math.max(8, ((currentIndex + 1) / stages.length) * 100)} sx={{ height: 7, borderRadius: 99, bgcolor: progressTrack, "& .MuiLinearProgress-bar": { bgcolor: accent } }} />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.7, mt: 1 }}>
        {stages.map((stage, index) => (
          <Typography key={stage} sx={{ color: index <= currentIndex ? ink : muted, fontSize: 11.5, fontWeight: index === currentIndex ? 760 : 540, textAlign: index === 0 ? "left" : index === stages.length - 1 ? "right" : "center" }}>
            {stage}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function ProjectMetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 1 }}>
      <Typography sx={{ color: muted, fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ color: ink, fontSize: 12, fontWeight: 700, textAlign: "right", overflowWrap: "anywhere" }}>{value}</Typography>
    </Stack>
  );
}

function ProjectActivityFeed({ project, localActivity }: { project: WorkItem; localActivity: ProjectActivityEvent[] }) {
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const events = useQuery(
    api.projectActivity.listForProject,
    isConvexAuthenticated ? { projectId: project.id } : "skip"
  );

  return (
    <Box sx={{ borderLeft: { lg: `1px solid ${border}` }, borderTop: { xs: `1px solid ${border}`, lg: "none" }, bgcolor: softPanel, minHeight: 0, overflowY: "auto", p: { xs: 2, md: 2.4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box>
          <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Project Activity</Typography>
          <Typography sx={{ color: muted, fontSize: 12, mt: 0.3 }}>Automatic history across the project lifecycle.</Typography>
        </Box>
        <ViewTimelineOutlinedIcon sx={{ color: accent, fontSize: 21 }} />
      </Stack>
      <Stack gap={0} sx={{ mt: 2 }}>
        {isConvexAuthLoading ? (
          <Typography sx={{ color: muted, fontSize: 13 }}>Connecting activity history...</Typography>
        ) : !isConvexAuthenticated ? (
          localActivity.length ? localActivity.map((event, index) => (
            <ActivityFeedItem key={event.id} actor={event.actorName} message={event.message} detail={event.detail} createdAt={event.createdAt} last={index === localActivity.length - 1} />
          )) : <ActivityFeedItem actor="Local workspace" message={`${project.title} is ready for its first update.`} createdAt={project.createdAt ?? new Date().toISOString()} last />
        ) : events === undefined ? (
          <Stack gap={1}><Skeleton variant="rounded" height={82} /><Skeleton variant="rounded" height={82} /></Stack>
        ) : events.length ? events.map((event, index) => (
          <ActivityFeedItem
            key={event._id}
            actor={event.actorName}
            message={event.message}
            detail={event.detail}
            createdAt={event.createdAt}
            last={index === events.length - 1}
          />
        )) : (
          <ActivityFeedItem actor="CutLab" message={`${project.title} is ready for its first update.`} createdAt={project.createdAt ?? new Date().toISOString()} last />
        )}
      </Stack>
    </Box>
  );
}

function ActivityFeedItem({ actor, message, detail, createdAt, last }: { actor: string; message: string; detail?: string; createdAt: string; last?: boolean }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", columnGap: 1.1 }}>
      <Box sx={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: accent, border: `2px solid ${softPanel}`, boxShadow: `0 0 0 1px ${accent}`, mt: 0.55, zIndex: 1 }} />
        {!last ? <Box sx={{ position: "absolute", top: 15, bottom: -4, width: "1px", bgcolor: border }} /> : null}
      </Box>
      <Box sx={{ pb: last ? 0 : 2.1, minWidth: 0 }}>
        <Typography sx={{ color: ink, fontSize: 12.5, lineHeight: 1.45 }}>{message}</Typography>
        {detail ? <Typography sx={{ color: muted, fontSize: 11.5, lineHeight: 1.5, mt: 0.45, whiteSpace: "pre-wrap" }}>{detail}</Typography> : null}
        <Typography sx={{ color: muted, fontSize: 10.5, mt: 0.55 }}>{actor} · {formatShortDateTime(createdAt)}</Typography>
      </Box>
    </Box>
  );
}

function ProjectFileManager({ project, canEdit }: { project: WorkItem; canEdit: boolean }) {
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const fileData = useQuery(
    api.projectFiles.listForProject,
    isConvexAuthenticated ? { projectId: project.id } : "skip"
  );
  const generateUploadUrl = useMutation(api.projectFiles.generateUploadUrl);
  const saveStorageVersion = useMutation(api.projectFiles.saveStorageVersion);
  const saveExternalVersion = useMutation(api.projectFiles.saveExternalVersion);
  const updateFile = useMutation(api.projectFiles.updateFile);
  const removeFile = useMutation(api.projectFiles.removeFile);
  const [view, setView] = useState<"files" | "history">("files");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [source, setSource] = useState<"upload" | "external">("upload");
  const [targetFileId, setTargetFileId] = useState<Id<"projectFiles"> | undefined>();
  const [browserFile, setBrowserFile] = useState<File | null>(null);
  const [category, setCategory] = useState<FileCategory>("Deliverable");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FileStatus>("draft");
  const [clientVisible, setClientVisible] = useState(false);
  const [downloadable, setDownloadable] = useState(true);
  const [notes, setNotes] = useState("");
  const [provider, setProvider] = useState<Exclude<FileProvider, "convex">>("external");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalId, setExternalId] = useState("");
  const [externalSize, setExternalSize] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const files = fileData?.files ?? [];
  const filteredFiles = categoryFilter === "All" ? files : files.filter((file) => file.category === categoryFilter);

  function resetForm() {
    setTargetFileId(undefined);
    setBrowserFile(null);
    setCategory("Deliverable");
    setTitle("");
    setDescription("");
    setStatus("draft");
    setClientVisible(false);
    setDownloadable(true);
    setNotes("");
    setProvider("external");
    setExternalUrl("");
    setExternalId("");
    setExternalSize(0);
    setError("");
  }

  function openNewFile(nextSource: "upload" | "external") {
    resetForm();
    setSource(nextSource);
    setDialogOpen(true);
  }

  function openNewVersion(file: NonNullable<typeof fileData>["files"][number], nextSource: "upload" | "external") {
    resetForm();
    setTargetFileId(file._id);
    setCategory(file.category);
    setTitle(file.title);
    setDescription(file.description);
    setStatus(file.status);
    setClientVisible(file.clientVisible);
    setDownloadable(file.downloadable);
    setSource(nextSource);
    setDialogOpen(true);
  }

  async function saveFileVersion() {
    if (!canEdit || !isConvexAuthenticated) return;
    if (!title.trim()) {
      setError("File title is required.");
      return;
    }
    setBusy("save");
    setError("");
    try {
      const shared = {
        projectId: project.id,
        projectFileId: targetFileId,
        category,
        title,
        description,
        status,
        clientVisible: category === "Deliverable" && clientVisible,
        downloadable,
        notes,
      };
      if (source === "upload") {
        if (!browserFile) throw new Error("Choose a file to upload.");
        const uploadUrl = await generateUploadUrl({ projectId: project.id });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": browserFile.type || "application/octet-stream" },
          body: browserFile,
        });
        if (!response.ok) throw new Error("File upload failed.");
        const payload = await response.json() as { storageId: Id<"_storage"> };
        await saveStorageVersion({
          ...shared,
          storageId: payload.storageId,
          fileName: browserFile.name,
          mimeType: browserFile.type || "application/octet-stream",
        });
      } else {
        if (!externalUrl.trim()) throw new Error("Enter a file URL.");
        await saveExternalVersion({
          ...shared,
          provider,
          externalUrl,
          externalId: externalId || undefined,
          fileName: title.trim(),
          mimeType: "application/octet-stream",
          size: Math.max(0, externalSize),
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this file.");
    } finally {
      setBusy("");
    }
  }

  async function changeFileMetadata(
    file: NonNullable<typeof fileData>["files"][number],
    overrides: Partial<{ status: FileStatus; clientVisible: boolean; downloadable: boolean }>
  ) {
    setBusy(`status-${file._id}`);
    setError("");
    try {
      await updateFile({
        fileId: file._id,
        category: file.category,
        title: file.title,
        description: file.description,
        status: overrides.status ?? file.status,
        clientVisible: overrides.clientVisible ?? file.clientVisible,
        downloadable: overrides.downloadable ?? file.downloadable,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update file status.");
    } finally {
      setBusy("");
    }
  }

  async function deleteProjectFile(fileId: Id<"projectFiles">) {
    setBusy(`remove-${fileId}`);
    setError("");
    try {
      await removeFile({ fileId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove this file.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <Paper sx={{ ...panelSx, p: 2, mt: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={1.4}>
          <Box>
            <Stack direction="row" alignItems="center" gap={0.8}>
              <InsertDriveFileOutlinedIcon sx={{ color: accent, fontSize: 20 }} />
              <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Project Files</Typography>
              <Chip label={`${files.length} files`} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px" }} />
            </Stack>
            <Typography sx={{ color: muted, fontSize: 12, mt: 0.4 }}>Deliverables, references, assets, uploads, and every saved version in one project model.</Typography>
          </Box>
          {canEdit && isConvexAuthenticated ? (
            <Stack direction="row" gap={0.8}>
              <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => openNewFile("external")} sx={outlineButtonSx}>Add Link</Button>
              <Button variant="contained" startIcon={<CloudUploadOutlinedIcon />} onClick={() => openNewFile("upload")} sx={{ bgcolor: accent, "&:hover": { bgcolor: accent } }}>Upload File</Button>
            </Stack>
          ) : null}
        </Stack>
        <Tabs value={view} onChange={(_, value) => setView(value)} sx={{ mt: 1.4, minHeight: 38, "& .MuiTab-root": { minHeight: 38, px: 1.2, color: muted }, "& .Mui-selected": { color: `${accent} !important` } }}>
          <Tab value="files" label="Files" />
          <Tab value="history" label="Upload History" />
        </Tabs>
        {isConvexAuthLoading ? (
          <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.5 }}><CircularProgress size={17} sx={{ color: accent }} /><Typography sx={{ color: muted, fontSize: 12.5 }}>Connecting project files...</Typography></Stack>
        ) : !isConvexAuthenticated ? (
          <Typography sx={{ color: muted, fontSize: 12.5, mt: 1.5 }}>Sign in to upload and synchronize project files. Existing integration links remain available above.</Typography>
        ) : fileData === undefined ? (
          <Stack gap={1} sx={{ mt: 1.5 }}><Skeleton variant="rounded" height={76} /><Skeleton variant="rounded" height={76} /></Stack>
        ) : view === "files" ? (
          <>
            <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 1.4, mb: 1.2 }}>
              {["All", ...FILE_CATEGORY_VALUES].map((item) => (
                <Chip key={item} label={item} onClick={() => setCategoryFilter(item)} sx={{ bgcolor: categoryFilter === item ? activeBg : softPanel, color: categoryFilter === item ? accent : muted, borderRadius: "5px", fontWeight: 700 }} />
              ))}
            </Stack>
            <Stack gap={1}>
              {filteredFiles.length ? filteredFiles.map((file) => {
                const latest = file.versions[0];
                return (
                  <Accordion key={file._id} data-testid="project-file-card" data-file-title={file.title} disableGutters sx={{ bgcolor: softPanel, color: ink, border: `1px solid ${border}`, borderRadius: "6px !important", "&:before": { display: "none" } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: muted }} />} sx={{ px: 1.4 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1} sx={{ width: "100%", pr: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" gap={0.7} flexWrap="wrap">
                            <Typography noWrap sx={{ color: ink, fontSize: 13.5, fontWeight: 760 }}>{file.title}</Typography>
                            <Chip label={file.category} size="small" sx={{ height: 20, bgcolor: activeBg, color: accent, borderRadius: "4px", fontSize: 10.5 }} />
                            {file.clientVisible ? (
                              <Chip
                                label={file.status === "draft" ? "Share when sent" : "Client visible"}
                                size="small"
                                sx={{ height: 20, bgcolor: file.status === "draft" ? activeBg : "var(--app-success-bg)", color: file.status === "draft" ? accent : successColor, borderRadius: "4px", fontSize: 10.5 }}
                              />
                            ) : null}
                          </Stack>
                          <Typography noWrap sx={{ color: muted, fontSize: 11.5, mt: 0.35 }}>
                            {latest ? `${latest.fileName} · v${latest.versionNumber} · ${formatFileSize(latest.size)} · ${latest.uploadedByName}` : "No versions"}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" gap={0.7} onClick={(event) => event.stopPropagation()}>
                          {canEdit ? <CompactSelect value={file.status} options={[...FILE_STATUS_VALUES]} labels={APPROVAL_STATUS_LABELS} onChange={(nextStatus) => changeFileMetadata(file, { status: nextStatus as FileStatus })} width={164} /> : <StatusChip status={approvalStatusLabel(file.status)} />}
                          {latest?.url ? <Button component="a" href={latest.url} target="_blank" rel="noreferrer" aria-label={`Open ${file.title}`} sx={{ minWidth: 34, width: 34, height: 34, color: accent, p: 0 }}><FileDownloadOutlinedIcon sx={{ fontSize: 18 }} /></Button> : null}
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 1.4, pt: 0, pb: 1.4 }}>
                      {file.description ? <Typography sx={{ color: muted, fontSize: 12, lineHeight: 1.5, mb: 1 }}>{file.description}</Typography> : null}
                      <Stack gap={0.7}>
                        {file.versions.map((version) => (
                          <Stack key={version._id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.8} sx={{ py: 0.8, borderTop: `1px solid ${border}` }}>
                            <Box>
                              <Typography sx={{ color: ink, fontSize: 12.5, fontWeight: 700 }}>Version {version.versionNumber} · {version.fileName}</Typography>
                              <Typography sx={{ color: muted, fontSize: 11, mt: 0.2 }}>{providerLabel(version.provider)} · {formatFileSize(version.size)} · {formatShortDateTime(version.uploadedAt)} · {version.uploadedByName}</Typography>
                              <Typography sx={{ color: version.status ? accent : muted, fontSize: 11, mt: 0.25 }}>
                                {version.status ? approvalStatusLabel(version.status) : "Approval state not recorded"}
                              </Typography>
                              {version.notes ? <Typography sx={{ color: muted, fontSize: 11.5, mt: 0.45 }}>{version.notes}</Typography> : null}
                            </Box>
                            {version.url ? <Button component="a" href={version.url} target="_blank" rel="noreferrer" size="small" endIcon={<OpenInNewIcon />} sx={{ color: accent, alignSelf: { xs: "flex-start", sm: "center" } }}>Open</Button> : null}
                          </Stack>
                        ))}
                      </Stack>
                      {canEdit ? (
                        <Stack direction="row" gap={0.8} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                          <Button size="small" startIcon={<CloudUploadOutlinedIcon />} onClick={() => openNewVersion(file, "upload")} sx={{ color: accent }}>Upload Version</Button>
                          <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => openNewVersion(file, "external")} sx={{ color: accent }}>Link Version</Button>
                          {file.category === "Deliverable" ? (
                            <>
                              <Stack direction="row" alignItems="center" gap={0.35}>
                                <Switch size="small" checked={file.clientVisible} onChange={(event) => changeFileMetadata(file, { clientVisible: event.target.checked })} />
                                <Typography sx={{ color: muted, fontSize: 11.5 }}>{file.status === "draft" ? "Share when sent" : "Client visible"}</Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" gap={0.35}>
                                <Switch size="small" checked={file.downloadable} onChange={(event) => changeFileMetadata(file, { downloadable: event.target.checked })} />
                                <Typography sx={{ color: muted, fontSize: 11.5 }}>Downloadable</Typography>
                              </Stack>
                            </>
                          ) : null}
                          <Button size="small" onClick={() => deleteProjectFile(file._id)} disabled={busy === `remove-${file._id}`} sx={{ color: dangerColor, ml: { sm: "auto" } }}>Remove File</Button>
                        </Stack>
                      ) : null}
                    </AccordionDetails>
                  </Accordion>
                );
              }) : <Typography sx={{ color: muted, fontSize: 12.5, py: 1 }}>No {categoryFilter === "All" ? "project files" : `${categoryFilter.toLowerCase()} files`} yet.</Typography>}
            </Stack>
          </>
        ) : (
          <Stack gap={0} sx={{ mt: 1.4 }}>
            {fileData.uploadHistory.length ? fileData.uploadHistory.map((version, index) => {
              const file = files.find((item) => item._id === version.projectFileId);
              return (
                <Stack key={version._id} direction="row" gap={1.1} sx={{ py: 1.1, borderBottom: index === fileData.uploadHistory.length - 1 ? "none" : `1px solid ${border}` }}>
                  <HistoryOutlinedIcon sx={{ color: accent, fontSize: 19, mt: 0.15 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ color: ink, fontSize: 12.5, fontWeight: 700 }}>{file?.title ?? version.fileName} · Version {version.versionNumber}</Typography>
                    <Typography sx={{ color: muted, fontSize: 11.2, mt: 0.25 }}>{version.fileName} · {formatFileSize(version.size)} · uploaded by {version.uploadedByName} · {formatShortDateTime(version.uploadedAt)}</Typography>
                    <Typography sx={{ color: version.status ? accent : muted, fontSize: 10.8, mt: 0.25 }}>
                      {version.status ? approvalStatusLabel(version.status) : "Approval state not recorded"}
                    </Typography>
                  </Box>
                  {version.url ? <Button component="a" href={version.url} target="_blank" rel="noreferrer" sx={{ minWidth: 32, width: 32, height: 32, color: accent, p: 0 }}><OpenInNewIcon sx={{ fontSize: 17 }} /></Button> : null}
                </Stack>
              );
            }) : <Typography sx={{ color: muted, fontSize: 12.5, py: 1 }}>Upload history will appear after the first file or linked version is added.</Typography>}
          </Stack>
        )}
        {error && !dialogOpen ? <Typography sx={{ color: dangerColor, fontSize: 12, mt: 1 }}>{error}</Typography> : null}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !busy && setDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
        <DialogTitle>{targetFileId ? "Add File Version" : "Add Project File"}</DialogTitle>
        <DialogContent>
          <Stack gap={1.4} sx={{ mt: 1 }}>
            <Tabs value={source} onChange={(_, value) => setSource(value)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 }, "& .Mui-selected": { color: `${accent} !important` } }}>
              <Tab value="upload" label="Upload" />
              <Tab value="external" label="External Link" />
            </Tabs>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.2}>
              {!targetFileId ? (
                <DialogSelect label="Category" value={category} options={[...FILE_CATEGORY_VALUES]} onChange={(value) => { setCategory(value as FileCategory); if (value !== "Deliverable") setClientVisible(false); }} />
              ) : null}
              <DialogSelect label="Approval state" value={status} options={[...FILE_STATUS_VALUES]} labels={APPROVAL_STATUS_LABELS} onChange={(value) => setStatus(value as FileStatus)} />
            </Stack>
            <TextField label="File title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={Boolean(targetFileId)} />
            {!targetFileId ? <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={2} /> : null}
            {source === "upload" ? (
              <Button component="label" variant="outlined" startIcon={<CloudUploadOutlinedIcon />} sx={{ ...outlineButtonSx, justifyContent: "flex-start" }}>
                {browserFile ? browserFile.name : "Choose file"}
                <input hidden type="file" onChange={(event) => setBrowserFile(event.target.files?.[0] ?? null)} />
              </Button>
            ) : (
              <>
                <DialogSelect label="Provider" value={provider} options={externalFileProviderOptions} labels={{ external: "External URL", google_drive: "Google Drive", dropbox: "Dropbox", frame_io: "Frame.io" }} onChange={(value) => setProvider(value as Exclude<FileProvider, "convex">)} />
                <TextField label="File URL" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://..." />
                <Stack direction={{ xs: "column", sm: "row" }} gap={1.2}>
                  <TextField label="Provider file ID" value={externalId} onChange={(event) => setExternalId(event.target.value)} fullWidth helperText="Optional. Reserved for future API synchronization." />
                  <TextField label="File size (bytes)" type="number" value={externalSize} onChange={(event) => setExternalSize(Math.max(0, Number(event.target.value) || 0))} fullWidth />
                </Stack>
              </>
            )}
            <TextField label="Version notes" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />
            {!targetFileId && category === "Deliverable" ? (
              <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <Stack direction="row" alignItems="center" gap={0.6}>
                  <Switch
                    checked={clientVisible}
                    onChange={(event) => setClientVisible(event.target.checked)}
                    size="small"
                    slotProps={{ input: { "aria-label": status === "draft" ? "Share when sent" : "Show in Client Portal" } }}
                  />
                  <Typography sx={{ color: muted, fontSize: 12 }}>{status === "draft" ? "Share when sent" : "Show in Client Portal"}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={0.6}><Switch checked={downloadable} onChange={(event) => setDownloadable(event.target.checked)} size="small" /><Typography sx={{ color: muted, fontSize: 12 }}>Allow download</Typography></Stack>
              </Stack>
            ) : null}
            {error ? <Typography sx={{ color: dangerColor, fontSize: 12.5 }}>{error}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={Boolean(busy)} sx={{ color: muted }}>Cancel</Button>
          <Button onClick={saveFileVersion} disabled={Boolean(busy)} variant="contained" sx={{ bgcolor: accent, "&:hover": { bgcolor: accent } }}>{busy ? "Saving..." : targetFileId ? "Add Version" : "Save File"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function formatFileSize(bytes: number) {
  if (!bytes) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function providerLabel(provider: string) {
  if (provider === "google_drive") return "Google Drive";
  if (provider === "dropbox") return "Dropbox";
  if (provider === "frame_io") return "Frame.io";
  if (provider === "convex") return "CutLab Upload";
  return "External Link";
}

function ClientPortalManager({ project, canEdit }: { project: WorkItem; canEdit: boolean }) {
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const portalData = useQuery(
    api.clientPortals.getForProject,
    isConvexAuthenticated ? { projectId: project.id } : "skip"
  );
  const publishPortal = useMutation(api.clientPortals.publish);
  const setPortalAccessControls = useMutation(api.clientPortals.setAccessControls);
  const regeneratePortalToken = useMutation(api.clientPortals.regenerateToken);
  const setPortalPasswordProtection = useMutation(api.clientPortals.setPasswordProtection);
  const removeDeliverable = useMutation(api.clientPortals.removeDeliverable);
  const updateDeliverableStatus = useMutation(api.clientPortals.updateDeliverableStatus);
  const updateRevisionStatus = useMutation(api.clientPortals.updateRevisionStatus);
  const [managerOpen, setManagerOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState(project.dueDate);
  const [revisionLimit, setRevisionLimit] = useState(2);
  const [clientStage, setClientStage] = useState<ClientPortalStage>("Planning");
  const [accessEnabled, setAccessEnabled] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const portal = portalData?.portal;

  function openManager() {
    setSummary(portal?.clientSummary ?? "");
    setClientNotes(portal?.clientNotes ?? "");
    setEstimatedCompletion(portal?.estimatedCompletion ?? project.dueDate);
    setRevisionLimit(portal?.revisionLimit ?? 2);
    setClientStage(portal?.status ?? clientPortalStage(project.status));
    setAccessEnabled(portal?.enabled ?? true);
    setExpiresAt(toDateTimeLocal(portal?.expiresAt));
    setPortalPassword("");
    setError("");
    setManagerOpen(true);
  }

  function portalUrl(token = portal?.token) {
    if (!token || typeof window === "undefined") return "";
    return `${window.location.origin}/client-portal/${token}`;
  }

  async function savePortal() {
    if (!canEdit || !isConvexAuthenticated) return;
    setBusy("publish");
    setError("");
    try {
      const result = await publishPortal({
        projectId: project.id,
        clientSummary: summary,
        clientNotes,
        estimatedCompletion,
        revisionLimit,
        clientStage
      });
      if (!portal) {
        await copyText(portalUrl(result.token));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish the client portal.");
    } finally {
      setBusy("");
    }
  }

  async function copyPortalLink() {
    const url = portalUrl();
    if (!url) return;
    const copied = await copyText(url);
    setError(copied ? "" : "Could not copy the portal link.");
  }

  async function saveAccessControls() {
    if (!portal || !canEdit) return;
    setBusy("access");
    setError("");
    try {
      await setPortalAccessControls({
        portalId: portal._id,
        enabled: accessEnabled,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update portal access.");
    } finally {
      setBusy("");
    }
  }

  async function regeneratePortalLink() {
    if (!portal || !canEdit) return;
    if (typeof window !== "undefined" && !window.confirm("Regenerate this portal link? The current link will stop working immediately.")) return;
    setBusy("regenerate");
    setError("");
    try {
      const result = await regeneratePortalToken({ portalId: portal._id });
      const copied = await copyText(portalUrl(result.token));
      if (!copied) setError("The link was regenerated, but it could not be copied.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not regenerate the portal link.");
    } finally {
      setBusy("");
    }
  }

  async function savePortalPassword() {
    if (!portal || !canEdit || portalPassword.length < 4) return;
    setBusy("password");
    setError("");
    try {
      await setPortalPasswordProtection({
        portalId: portal._id,
        password: portalPassword,
      });
      setPortalPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update portal protection.");
    } finally {
      setBusy("");
    }
  }

  async function removePortalPassword() {
    if (!portal || !canEdit) return;
    setBusy("password-remove");
    setError("");
    try {
      await setPortalPasswordProtection({ portalId: portal._id, password: null });
      setPortalPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove portal protection.");
    } finally {
      setBusy("");
    }
  }

  async function deleteDeliverable(deliverableId: Parameters<typeof removeDeliverable>[0]["deliverableId"]) {
    setBusy(`remove-${deliverableId}`);
    setError("");
    try {
      await removeDeliverable({ deliverableId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the deliverable.");
    } finally {
      setBusy("");
    }
  }

  async function changeDeliverableStatus(deliverableId: Parameters<typeof updateDeliverableStatus>[0]["deliverableId"], status: DeliverableStatus) {
    setBusy(`deliverable-${deliverableId}`);
    setError("");
    try {
      await updateDeliverableStatus({ deliverableId, status });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the deliverable.");
    } finally {
      setBusy("");
    }
  }

  async function changeRevisionStatus(revisionId: Parameters<typeof updateRevisionStatus>[0]["revisionId"], status: RevisionStatus) {
    setBusy(`revision-${revisionId}`);
    setError("");
    try {
      await updateRevisionStatus({ revisionId, status });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the revision request.");
    } finally {
      setBusy("");
    }
  }

  const portalExpired = Boolean(portal?.expiresAt && Date.parse(portal.expiresAt) <= Date.now());
  const portalAccessLabel = !portal?.enabled ? "Disabled" : portalExpired ? "Expired" : "Active";

  return (
    <>
      <Paper sx={{ ...panelSx, p: 2, mt: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1.5}>
          <Box>
            <Stack direction="row" alignItems="center" gap={0.8}>
              <PublicOutlinedIcon sx={{ color: accent, fontSize: 20 }} />
              <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Client Portal</Typography>
              {portal ? <Chip label={portalAccessLabel} size="small" sx={{ bgcolor: portal.enabled && !portalExpired ? activeBg : softPanel, color: portal.enabled && !portalExpired ? accent : muted, borderRadius: "5px" }} /> : null}
            </Stack>
            <Typography sx={{ color: muted, fontSize: 12.5, mt: 0.45 }}>
              Share a client-safe project view without exposing internal notes, earnings, or team activity.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={openManager} disabled={isConvexAuthLoading || !isConvexAuthenticated} sx={outlineButtonSx}>
            {portal ? "Manage Portal" : "Create Portal"}
          </Button>
        </Stack>
        {!isConvexAuthLoading && !isConvexAuthenticated ? (
          <Typography sx={{ color: muted, fontSize: 12, mt: 1 }}>Sign in with cloud sync enabled to publish a shareable portal.</Typography>
        ) : null}
        {portalData === undefined && isConvexAuthenticated ? (
          <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.4 }}><CircularProgress size={16} sx={{ color: accent }} /><Typography sx={{ color: muted, fontSize: 12 }}>Loading client workspace...</Typography></Stack>
        ) : portal ? (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.2, mt: 1.6 }}>
              <Box sx={{ p: 1.3, bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "6px" }}>
                <Typography sx={{ color: muted, fontSize: 11, fontWeight: 760, textTransform: "uppercase" }}>Client Notes</Typography>
                <Typography sx={{ color: portal.clientNotes ? ink : muted, fontSize: 12.5, lineHeight: 1.5, mt: 0.7, whiteSpace: "pre-wrap" }}>{portal.clientNotes || "No client-facing notes saved."}</Typography>
              </Box>
              <Box sx={{ p: 1.3, bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "6px" }}>
                <Typography sx={{ color: muted, fontSize: 11, fontWeight: 760, textTransform: "uppercase" }}>Deliverables</Typography>
                <Typography sx={{ color: ink, fontSize: 24, fontWeight: 760, mt: 0.35 }}>{portalData.deliverables.length}</Typography>
                <Typography sx={{ color: muted, fontSize: 11.5 }}>{portalData.deliverables.filter((item) => item.status === "final_delivered").length} final · {portalData.deliverables.filter((item) => item.status === "approved").length} approved</Typography>
              </Box>
              <Box sx={{ p: 1.3, bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "6px" }}>
                <Typography sx={{ color: muted, fontSize: 11, fontWeight: 760, textTransform: "uppercase" }}>Revision History</Typography>
                <Typography sx={{ color: ink, fontSize: 24, fontWeight: 760, mt: 0.35 }}>{portalData.revisions.length} / {portal.revisionLimit}</Typography>
                <Typography sx={{ color: muted, fontSize: 11.5 }}>{portalData.revisions.filter((item) => item.status !== "Resolved").length} active requests</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.2, mt: 1.2 }}>
              <Box sx={{ p: 1.3, bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "6px", minWidth: 0 }}>
                <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760, mb: 0.8 }}>Deliverables</Typography>
                <Stack divider={<Divider flexItem sx={{ borderColor: border }} />} sx={{ maxHeight: { xs: 260, md: 320 }, overflowY: "auto" }}>
                  {portalData.deliverables.length ? portalData.deliverables.map((item) => (
                    <Stack key={item._id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={0.8} sx={{ py: 0.9 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ color: ink, fontSize: 12.5, fontWeight: 700 }}>{item.title}</Typography>
                        <Typography noWrap sx={{ color: muted, fontSize: 11.2, mt: 0.2 }}>{item.detail || item.url}</Typography>
                      </Box>
                      {canEdit ? <CompactSelect value={item.status} options={[...DELIVERABLE_STATUS_VALUES]} labels={APPROVAL_STATUS_LABELS} onChange={(status) => changeDeliverableStatus(item._id, status as DeliverableStatus)} width={{ xs: "100%", sm: 164 }} /> : <StatusChip status={approvalStatusLabel(item.status)} />}
                    </Stack>
                  )) : <Typography sx={{ color: muted, fontSize: 12 }}>No deliverables yet.</Typography>}
                </Stack>
              </Box>
              <Box sx={{ p: 1.3, bgcolor: softPanel, border: `1px solid ${border}`, borderRadius: "6px", minWidth: 0 }}>
                <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760, mb: 0.8 }}>Revision History</Typography>
                <Stack gap={0.8} sx={{ maxHeight: { xs: 260, md: 320 }, overflowY: "auto" }}>
                  {portalData.revisions.length ? portalData.revisions.map((revision) => (
                    <Box key={revision._id} sx={{ py: 0.8, borderBottom: `1px solid ${border}` }}>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.7}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: ink, fontSize: 12.5, fontWeight: 700 }}>{revision.clientName}</Typography>
                          <Typography sx={{ color: muted, fontSize: 10.8, mt: 0.2 }}>{formatShortDateTime(revision.createdAt)}</Typography>
                        </Box>
                        {canEdit ? <CompactSelect value={revision.status} options={[...REVISION_STATUS_VALUES]} onChange={(status) => changeRevisionStatus(revision._id, status as RevisionStatus)} width={{ xs: "100%", sm: 130 }} /> : <StatusChip status={revision.status} />}
                      </Stack>
                      <TimecodeChip value={revision.timecode} />
                      <Typography sx={{ color: muted, fontSize: 11.5, lineHeight: 1.45, mt: 0.55, whiteSpace: "pre-wrap" }}>{revision.message}</Typography>
                    </Box>
                  )) : <Typography sx={{ color: muted, fontSize: 12 }}>No revision requests yet.</Typography>}
                </Stack>
              </Box>
            </Box>
          </>
        ) : null}
      </Paper>

      <Dialog open={managerOpen} data-testid="client-portal-manager" onClose={() => setManagerOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "10px" } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${border}`, px: { xs: 2, md: 3 }, py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Box>
              <Typography sx={{ color: ink, fontSize: 21, fontWeight: 760 }}>Client Portal</Typography>
              <Typography sx={{ color: muted, fontSize: 12.5, mt: 0.3 }}>{project.title}</Typography>
            </Box>
            <Button aria-label="Close client portal manager" onClick={() => setManagerOpen(false)} sx={{ minWidth: 34, width: 34, height: 34, color: muted, p: 0 }}><CloseIcon /></Button>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
          {portalData === undefined ? (
            <Stack direction="row" alignItems="center" gap={1.2}><CircularProgress size={20} sx={{ color: accent }} /><Typography sx={{ color: muted, fontSize: 13 }}>Loading portal settings...</Typography></Stack>
          ) : (
            <Stack gap={2}>
              <Paper sx={{ ...panelSx, p: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
                  <Box>
                    <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Public Link</Typography>
                    <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>
                      {portal ? "Anyone with this unguessable link can view the client-safe project snapshot." : "Publish once to generate an unguessable project link."}
                    </Typography>
                  </Box>
                  {portal ? (
                    <Stack direction="row" gap={0.8} flexWrap="wrap">
                      <Button onClick={copyPortalLink} variant="outlined" sx={outlineButtonSx}>Copy Link</Button>
                      <Button component="a" href={portalUrl()} target="_blank" rel="noreferrer" variant="outlined" endIcon={<OpenInNewIcon />} sx={outlineButtonSx}>Open</Button>
                      <Button onClick={regeneratePortalLink} disabled={!canEdit || busy === "regenerate"} sx={{ color: dangerColor }}>
                        {busy === "regenerate" ? "Regenerating..." : "Regenerate Link"}
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Paper>

              {portal ? (
                <Paper sx={{ ...panelSx, p: 2 }}>
                  <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Access Controls</Typography>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.35 }}>Disable access immediately or set an optional expiry for this public link.</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(220px, 1fr) auto" }, gap: 1.2, alignItems: "center", mt: 1.5 }}>
                    <Stack direction="row" alignItems="center" gap={0.8}>
                      <Switch
                        checked={accessEnabled}
                        onChange={(event) => setAccessEnabled(event.target.checked)}
                        disabled={!canEdit}
                        slotProps={{ input: { "aria-label": "Portal access" } }}
                      />
                      <Box>
                        <Typography sx={{ color: ink, fontSize: 13, fontWeight: 700 }}>Portal access</Typography>
                        <Typography sx={{ color: muted, fontSize: 11.5 }}>{accessEnabled ? "Anyone with the current link can access it." : "The public link is blocked."}</Typography>
                      </Box>
                    </Stack>
                    <TextField
                      label="Expires"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      helperText="Optional. Uses your local time."
                      disabled={!canEdit}
                    />
                    <Button variant="outlined" onClick={saveAccessControls} disabled={!canEdit || busy === "access"} sx={outlineButtonSx}>
                      {busy === "access" ? "Saving..." : "Save Access"}
                    </Button>
                  </Box>
                </Paper>
              ) : null}

              {portal ? (
                <Paper sx={{ ...panelSx, p: 2 }}>
                  <Stack direction="row" alignItems="center" gap={0.8}>
                    <LockOutlinedIcon sx={{ color: accent, fontSize: 20 }} />
                    <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>PIN Or Password</Typography>
                    <Chip
                      label={portal.passwordProtected ? "Protected" : "Not protected"}
                      size="small"
                      sx={{ bgcolor: portal.passwordProtected ? activeBg : softPanel, color: portal.passwordProtected ? accent : muted, borderRadius: "5px" }}
                    />
                  </Stack>
                  <Typography sx={{ color: muted, fontSize: 12, mt: 0.45 }}>
                    Optional. The credential is hashed before storage and cannot be viewed after saving.
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto auto" }, gap: 1, alignItems: "start", mt: 1.4 }}>
                    <TextField
                      label={portal.passwordProtected ? "New PIN or password" : "PIN or password"}
                      type="password"
                      value={portalPassword}
                      onChange={(event) => setPortalPassword(event.target.value)}
                      inputProps={{ minLength: 4, maxLength: 128 }}
                      helperText="4-128 characters. Leave blank to keep the current setting."
                      autoComplete="new-password"
                      disabled={!canEdit}
                    />
                    <Button variant="outlined" onClick={savePortalPassword} disabled={!canEdit || portalPassword.length < 4 || busy === "password"} sx={outlineButtonSx}>
                      {busy === "password" ? "Saving..." : portal.passwordProtected ? "Update" : "Enable"}
                    </Button>
                    {portal.passwordProtected ? (
                      <Button onClick={removePortalPassword} disabled={!canEdit || busy === "password-remove"} sx={{ color: dangerColor }}>
                        {busy === "password-remove" ? "Removing..." : "Remove"}
                      </Button>
                    ) : null}
                  </Box>
                </Paper>
              ) : null}

              <Paper sx={{ ...panelSx, p: 2 }}>
                <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760, mb: 1.4 }}>Client-Facing Project Details</Typography>
                <Stack gap={1.2}>
                  <TextField label="Project summary" value={summary} onChange={(event) => setSummary(event.target.value)} multiline minRows={3} inputProps={{ maxLength: 800 }} helperText={`${summary.length}/800 characters`} disabled={!canEdit} />
                  <TextField label="Client-facing notes" value={clientNotes} onChange={(event) => setClientNotes(event.target.value)} multiline minRows={3} inputProps={{ maxLength: 2000 }} helperText="Only notes entered here are visible. Internal project notes are never copied." disabled={!canEdit} />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.2 }}>
                    <TextField label="Estimated completion" type="date" value={estimatedCompletion} onChange={(event) => setEstimatedCompletion(event.target.value)} InputLabelProps={{ shrink: true }} disabled={!canEdit} />
                    <TextField label="Included revisions" type="number" value={revisionLimit} onChange={(event) => setRevisionLimit(Math.max(0, Math.min(20, Number(event.target.value) || 0)))} inputProps={{ min: 0, max: 20 }} disabled={!canEdit} />
                    <Box>
                      <Typography sx={{ color: muted, fontSize: 11, fontWeight: 700, mb: 0.55 }}>Client workflow stage</Typography>
                      <CompactSelect value={clientStage} options={[...CLIENT_PORTAL_STAGE_VALUES]} onChange={(value) => setClientStage(value as ClientPortalStage)} width="100%" />
                    </Box>
                  </Box>
                  <Button variant="contained" onClick={savePortal} disabled={!canEdit || busy === "publish"} sx={{ alignSelf: "flex-start", bgcolor: accent, "&:hover": { bgcolor: accent } }}>
                    {busy === "publish" ? "Saving..." : portal ? "Update Portal" : "Publish Portal"}
                  </Button>
                </Stack>
              </Paper>

              {portal ? (
                <>
                  <Paper sx={{ ...panelSx, p: 2 }}>
                    <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Legacy Deliverable Links</Typography>
                    <Typography sx={{ color: muted, fontSize: 12, mt: 0.35, mb: 1.4 }}>New deliverables are managed in Project Files. Existing portal links remain editable here for backward compatibility.</Typography>
                    {portalData.deliverables.length ? (
                      <Stack divider={<Divider flexItem sx={{ borderColor: border }} />} sx={{ mb: 1.5 }}>
                        {portalData.deliverables.map((item) => (
                          <Stack key={item._id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1} sx={{ py: 1 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{item.title}</Typography>
                              <Typography noWrap sx={{ color: muted, fontSize: 11.5, mt: 0.25 }}>{item.detail || item.url}</Typography>
                            </Box>
                            <Stack direction="row" alignItems="center" gap={0.6}>
                              {canEdit ? (
                                <CompactSelect value={item.status} options={[...DELIVERABLE_STATUS_VALUES]} labels={APPROVAL_STATUS_LABELS} onChange={(status) => changeDeliverableStatus(item._id, status as DeliverableStatus)} width={164} />
                              ) : <Chip label={approvalStatusLabel(item.status)} size="small" />}
                              {canEdit ? <Button onClick={() => deleteDeliverable(item._id)} disabled={busy === `remove-${item._id}`} sx={{ color: dangerColor, minWidth: 0 }}>Remove</Button> : null}
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    ) : <Typography sx={{ color: muted, fontSize: 12.5 }}>No legacy deliverable links remain. Use Project Files for all new deliverables.</Typography>}
                  </Paper>

                  <Paper sx={{ ...panelSx, p: 2 }}>
                    <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Client Revision Requests</Typography>
                    <Typography sx={{ color: muted, fontSize: 12, mt: 0.35, mb: 1.4 }}>Requests submitted through the public link appear here in real time.</Typography>
                    {portalData.revisions.length ? (
                      <Stack gap={1}>
                        {portalData.revisions.map((revision) => (
                          <Box key={revision._id} sx={{ p: 1.2, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: softPanel }}>
                            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>{revision.clientName}</Typography>
                                <Typography sx={{ color: muted, fontSize: 11.5, mt: 0.2 }}>{formatShortDateTime(revision.createdAt)}</Typography>
                              </Box>
                              {canEdit ? <CompactSelect value={revision.status} options={[...REVISION_STATUS_VALUES]} onChange={(status) => changeRevisionStatus(revision._id, status as RevisionStatus)} width={{ xs: "100%", sm: 150 }} /> : <Chip label={revision.status} size="small" />}
                            </Stack>
                            <TimecodeChip value={revision.timecode} />
                            <Typography sx={{ color: ink, fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap", mt: 0.8 }}>{revision.message}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : <Typography sx={{ color: muted, fontSize: 12.5 }}>No revision requests have been submitted.</Typography>}
                  </Paper>
                </>
              ) : null}
              {error ? <Typography sx={{ color: dangerColor, fontSize: 12.5 }}>{error}</Typography> : null}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function clientPortalStage(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("deliver") || normalized.includes("complete") || normalized === "done") return "Delivered";
  if (normalized.includes("review") || normalized.includes("revision") || normalized.includes("feedback")) return "Review";
  if (normalized.includes("progress") || normalized.includes("editing") || normalized.includes("active")) return "In Progress";
  return "Planning";
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function ProjectDetailCollaborationPanel({ project, teamMembers, canComment }: { project: WorkItem; teamMembers: WorkspaceMemberOption[]; canComment: boolean }) {
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const addProjectComment = useMutation(api.team.addProjectComment);
  const [commentBody, setCommentBody] = useState("");
  const [commentTimecode, setCommentTimecode] = useState("");
  const [commentError, setCommentError] = useState("");
  const projectComments = useQuery(
    api.team.listProjectComments,
    isConvexAuthenticated && project.teamId ? { teamId: project.teamId, projectId: project.id } : "skip"
  );
  const assignedMembers = teamMembers.filter((member) => (project.assigneeUserIds ?? []).includes(member.userId));

  async function postComment() {
    if (!isConvexAuthenticated || !project.teamId || !commentBody.trim()) return;
    setCommentError("");
    try {
      const normalizedTimecode = normalizeOptionalTimecode(commentTimecode);
      await addProjectComment({
        teamId: project.teamId,
        projectId: project.id,
        body: commentBody,
        ...(normalizedTimecode ? { timecode: normalizedTimecode } : {}),
      });
      setCommentBody("");
      setCommentTimecode("");
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Could not post comment.");
    }
  }

  if (!project.teamId) {
    return null;
  }

  return (
    <Paper sx={{ ...panelSx, p: 2, mt: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2} sx={{ mb: 1.4 }}>
        <Box>
          <Typography sx={{ color: ink, fontSize: 16, fontWeight: 760 }}>Team Collaboration</Typography>
          <Typography sx={{ color: muted, fontSize: 12.5, mt: 0.35 }}>Assignments and project comments sync to the team workspace.</Typography>
        </Box>
        <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
          {assignedMembers.length ? assignedMembers.map((member) => (
            <Chip key={member.userId} label={member.name || member.email} size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px", fontWeight: 720 }} />
          )) : <Chip label="Unassigned" size="small" sx={{ bgcolor: softPanel, color: muted, borderRadius: "5px" }} />}
        </Stack>
      </Stack>

      <Stack gap={1} sx={{ maxHeight: 280, overflow: "auto", mb: 1.2 }}>
        {isConvexAuthLoading ? (
          <Typography sx={{ color: muted, fontSize: 13 }}>Connecting Team comments...</Typography>
        ) : !isConvexAuthenticated ? (
          <Typography sx={{ color: dangerColor, fontSize: 13 }}>Team comments require Convex auth. Check Team sync before posting comments.</Typography>
        ) : projectComments === undefined ? (
          <Typography sx={{ color: muted, fontSize: 13 }}>Loading comments...</Typography>
        ) : projectComments.length ? projectComments.map((comment) => (
          <Box key={comment._id} sx={{ p: 1.15, border: `1px solid ${border}`, borderRadius: "6px", bgcolor: panel }}>
            <Typography sx={{ color: ink, fontSize: 13, fontWeight: 760 }}>
              {comment.authorName} <Box component="span" sx={{ color: muted, fontSize: 11, fontWeight: 500 }}>{formatShortDateTime(comment.createdAt)}</Box>
            </Typography>
            <TimecodeChip value={comment.timecode} />
            <Typography sx={{ color: ink, fontSize: 13, mt: 0.5, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{comment.body}</Typography>
          </Box>
        )) : (
          <Typography sx={{ color: muted, fontSize: 13 }}>No comments yet. Add a note for the team or mention someone with @name.</Typography>
        )}
      </Stack>

      {canComment ? (
        <Stack direction={{ xs: "column", md: "row" }} gap={1}>
          <TextField
            label="Timecode (optional)"
            value={commentTimecode}
            size="small"
            placeholder="00:12"
            sx={{ width: { xs: "100%", md: 180 }, flexShrink: 0 }}
            slotProps={{ htmlInput: { maxLength: 8, inputMode: "text" } }}
            helperText={TIMECODE_FORMAT_HINT}
            onChange={(event) => {
              setCommentTimecode(event.target.value);
              if (commentError) setCommentError("");
            }}
          />
          <TextField
            label="Team comment"
            value={commentBody}
            size="small"
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: TEAM_PROJECT_COMMENT_LIMIT } }}
            onChange={(event) => setCommentBody(event.target.value)}
            helperText={commentError || `${commentBody.length}/${TEAM_PROJECT_COMMENT_LIMIT} characters · Use @name or @emailname to notify a teammate.`}
            error={Boolean(commentError)}
          />
          <Button variant="contained" sx={{ bgcolor: accent, minWidth: 112, "&:hover": { bgcolor: accent } }} disabled={!isConvexAuthenticated || !commentBody.trim()} onClick={postComment}>Post</Button>
        </Stack>
      ) : (
        <Typography sx={{ color: muted, fontSize: 13 }}>Your team role can view comments but cannot add new ones.</Typography>
      )}
    </Paper>
  );
}

function ProjectDialog({
  open,
  editing,
  form,
  setForm,
  formError,
  clientOptions,
  workTypeOptions,
  settings,
  teamMembers,
  onClose,
  onSave
}: {
  open: boolean;
  editing: boolean;
  form: WorkItem;
  setForm: (form: WorkItem) => void;
  formError: string;
  clientOptions: string[];
  workTypeOptions: string[];
  settings: SettingsState;
  teamMembers: WorkspaceMemberOption[];
  onClose: () => void;
  onSave: () => void;
}) {
  const selectedWorkType = workTypeOptions.some((option) => option.toLowerCase() === form.workType.toLowerCase()) ? canonicalWorkType(form.workType, workTypeOptions) : workTypeOptions[0];
  const typeConfig = getTypeConfig(selectedWorkType, settings);
  const assignedMembers = teamMembers.filter((member) => (form.assigneeUserIds ?? []).includes(member.userId));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
      <DialogTitle sx={{ fontSize: 24, fontWeight: 760 }}>{editing ? "Edit Project" : "New Project"}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ mt: 1 }}>
          <TextField label="Project name" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} fullWidth />
          <Autocomplete
            freeSolo
            selectOnFocus
            clearOnBlur={false}
            handleHomeEndKeys
            options={clientOptions}
            noOptionsText="Type a new client name"
            value={form.client || ""}
            inputValue={form.client || ""}
            onInputChange={(_, value) => setForm({ ...form, client: value })}
            onChange={(_, value) => setForm({ ...form, client: canonicalClientName(typeof value === "string" ? value : "", clientOptions) })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Client"
                placeholder={clientOptions.length ? "Choose existing or type new client" : "Type a new client name"}
                helperText={clientSuggestionText(form.client || "", clientOptions)}
                fullWidth
              />
            )}
          />
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <DialogSelect label="Status" value={form.status} options={statusOptions} onChange={(value) => setForm({ ...form, status: value })} />
            <DialogSelect label="Tag" value={selectedWorkType} options={workTypeOptions} onChange={(value) => setForm({ ...form, workType: value, earnings: 0 })} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <DatePickerField label="Start date" value={form.startDate} settings={settings} onChange={(value) => setForm({ ...form, startDate: value })} />
            <DatePickerField label="Due date" value={form.dueDate} settings={settings} onChange={(value) => setForm({ ...form, dueDate: value })} />
          </Stack>
          <TextField label="Earnings" type="number" value={form.earnings} disabled={typeConfig.earningsMode === "batch"} helperText={typeConfig.earningsMode === "batch" ? `${settings.salaryWorkType} earnings are batch tracked in settings.` : ""} onChange={(event) => setForm({ ...form, earnings: Number(event.target.value || 0) })} fullWidth />
          <TextField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} fullWidth multiline minRows={3} />
          <TemplateSetupEditor form={form} setForm={setForm} />
          {form.teamId && teamMembers.length ? (
            <Autocomplete
              multiple
              options={teamMembers}
              value={assignedMembers}
              isOptionEqualToValue={(option, value) => option.userId === value.userId}
              getOptionLabel={(option) => option.name || option.email || "Team member"}
              onChange={(_, members) => setForm({ ...form, assigneeUserIds: members.map((member) => member.userId) })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assigned team members"
                  helperText="Assigned members receive project notifications when this project changes."
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.userId}>
                  <Box>
                    <Typography sx={{ color: ink, fontSize: 13, fontWeight: 720 }}>{option.name}</Typography>
                    <Typography sx={{ color: muted, fontSize: 12 }}>{option.role} · {option.email || "No email"}</Typography>
                  </Box>
                </Box>
              )}
            />
          ) : null}
          <IntegrationLinkManager
            title="Project Integrations"
            subtitle="Attach service links that belong only to this project."
            links={form.integrationLinks}
            emptyTitle="No project links"
            emptyBody="Add links to this project's folders, reviews, channels, or calendar events."
            onChange={(integrationLinks) => setForm({ ...form, integrationLinks })}
          />
          {formError ? <Typography sx={{ color: dangerColor, fontSize: 13 }}>{formError}</Typography> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: muted }}>Cancel</Button>
        <Button onClick={onSave} variant="contained" sx={{ bgcolor: accent, color: cutlab.color.softWhite, "&:hover": { bgcolor: "var(--app-highlight)", color: cutlab.color.charcoal } }}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function TemplateSetupEditor({
  form,
  setForm,
}: {
  form: WorkItem;
  setForm: (form: WorkItem) => void;
}) {
  const hasTemplateSetup = Boolean(
    form.templateId ||
    form.workflowStages?.length ||
    form.templateDeliverables?.length ||
    form.checklistItems?.length
  );
  if (!hasTemplateSetup) return null;

  const deliverables = form.templateDeliverables ?? [];
  return (
    <Box sx={{ border: `1px solid ${border}`, borderRadius: "6px", p: 1.5, bgcolor: softPanel }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box>
          <Typography sx={{ color: ink, fontSize: 15, fontWeight: 760 }}>Template Setup</Typography>
          <Typography sx={{ color: muted, fontSize: 11.5, mt: 0.25 }}>These are suggestions, not locked rules. Edit or remove anything.</Typography>
        </Box>
        <Chip label="Editable" size="small" sx={{ bgcolor: activeBg, color: accent, borderRadius: "5px" }} />
      </Stack>
      <Stack gap={1.3} sx={{ mt: 1.5 }}>
        <TextField
          label="Project type"
          value={form.templateProjectType ?? ""}
          onChange={(event) => setForm({ ...form, templateProjectType: event.target.value })}
          helperText="A descriptive type for this workflow; the project tag above still controls reporting and salary batches."
        />
        <TextField
          label="Workflow stages"
          value={(form.workflowStages ?? []).join("\n")}
          onChange={(event) => setForm({
            ...form,
            workflowStages: event.target.value.split("\n").slice(0, 12),
          })}
          multiline
          minRows={3}
          helperText="One stage per line."
        />
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 0.8 }}>
            <Typography sx={{ color: ink, fontSize: 13, fontWeight: 740 }}>Suggested deliverables</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setForm({
                ...form,
                templateDeliverables: [...deliverables, { title: "New deliverable", category: "Deliverable", initialStatus: "draft" }],
              })}
              sx={{ color: accent }}
            >
              Add
            </Button>
          </Stack>
          <Stack gap={0.8}>
            {deliverables.map((deliverable, index) => (
              <Box key={`template-deliverable-${index}`} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 140px 170px auto" }, gap: 0.8, alignItems: "center" }}>
                <TextField
                  label="Deliverable"
                  size="small"
                  value={deliverable.title}
                  onChange={(event) => setForm({
                    ...form,
                    templateDeliverables: deliverables.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item),
                  })}
                />
                <DialogSelect
                  label="Category"
                  value={deliverable.category}
                  options={FILE_CATEGORY_VALUES}
                  onChange={(category) => setForm({
                    ...form,
                    templateDeliverables: deliverables.map((item, itemIndex) => itemIndex === index ? { ...item, category } : item),
                  })}
                />
                <DialogSelect
                  label="Initial status"
                  value={deliverable.initialStatus}
                  options={FILE_STATUS_VALUES}
                  labels={APPROVAL_STATUS_LABELS}
                  onChange={(initialStatus) => setForm({
                    ...form,
                    templateDeliverables: deliverables.map((item, itemIndex) => itemIndex === index ? { ...item, initialStatus } : item),
                  })}
                />
                <Tooltip title="Remove deliverable">
                  <Button
                    aria-label={`Remove ${deliverable.title}`}
                    onClick={() => setForm({ ...form, templateDeliverables: deliverables.filter((_, itemIndex) => itemIndex !== index) })}
                    sx={{ minWidth: 36, color: dangerColor }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </Button>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        </Box>
        <TextField
          label="Checklist"
          value={(form.checklistItems ?? []).join("\n")}
          onChange={(event) => {
            const checklistItems = event.target.value.split("\n").slice(0, 20);
            setForm({
              ...form,
              checklistItems,
              checklistCompleted: normalizeChecklistCompleted(checklistItems, form.checklistCompleted),
            });
          }}
          multiline
          minRows={3}
          helperText="One checklist item per line."
        />
      </Stack>
    </Box>
  );
}

function DeleteProjectDialog({ project, onCancel, onConfirm }: { project: WorkItem | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={Boolean(project)} onClose={onCancel} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: panel, color: ink, border: `1px solid ${border}`, borderRadius: "8px" } }}>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 760 }}>Delete project?</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: muted, fontSize: 14 }}>
          {project ? `"${project.title}" will be removed from your tracker.` : "This project will be removed from your tracker."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} sx={{ color: muted }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" sx={{ bgcolor: dangerColor, color: cutlab.color.charcoal, "&:hover": { bgcolor: dangerColor } }}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}

function DialogSelect<T extends string>({ label, value, options, labels, onChange }: { label: string; value: T; options: readonly T[]; labels?: Record<string, string>; onChange: (value: T) => void }) {
  const labelId = useId();
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} label={label} value={value} onChange={(event: SelectChangeEvent) => onChange(event.target.value as T)}>
        {options.map((option) => <MenuItem key={option} value={option}>{labels?.[option] ?? option}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function DatePickerField({ label, value, settings, onChange }: { label: string; value: string; settings: SettingsState; onChange: (value: string) => void }) {
  const selected = isIsoDate(value) ? new Date(`${value}T00:00:00`) : todayDate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const open = Boolean(anchor);
  const monthDays = calendarMonthDays(visibleMonth, settings.weekStart);
  const weekdays = orderedWeekdays(settings.weekStart);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth);

  function shiftMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function chooseDate(next: string) {
    onChange(next);
    setAnchor(null);
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ color: muted, fontSize: 12, fontWeight: 680, mb: 0.7 }}>{label}</Typography>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<CalendarTodayOutlinedIcon sx={{ fontSize: 17 }} />}
        onClick={(event) => {
          const nextSelected = isIsoDate(value) ? new Date(`${value}T00:00:00`) : todayDate();
          setVisibleMonth(new Date(nextSelected.getFullYear(), nextSelected.getMonth(), 1));
          setAnchor(event.currentTarget);
        }}
        sx={{ justifyContent: "flex-start", borderColor: border, color: ink, bgcolor: controlPanel, height: 46, borderRadius: "6px", fontSize: 14, fontWeight: 650, "&:hover": { borderColor: accent, bgcolor: hoverBg } }}
      >
        {isIsoDate(value) ? formatDate(value, settings.dateFormat) : "Choose date"}
      </Button>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { width: 330, maxWidth: "calc(100vw - 32px)", p: 1.2, bgcolor: panel, color: ink, border: `1px solid ${border}`, boxShadow: "none" } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.4, mb: 1 }}>
          <Button size="small" aria-label={`Previous ${label.toLowerCase()} month`} onClick={() => shiftMonth(-1)} sx={{ minWidth: 32, color: accent, border: `1px solid ${border}` }}>‹</Button>
          <Typography sx={{ color: ink, fontSize: 14, fontWeight: 760 }}>{monthLabel}</Typography>
          <Button size="small" aria-label={`Next ${label.toLowerCase()} month`} onClick={() => shiftMonth(1)} sx={{ minWidth: 32, color: accent, border: `1px solid ${border}` }}>›</Button>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.4 }}>
          {weekdays.map((day) => (
            <Typography key={day} sx={{ color: muted, fontSize: 10, fontWeight: 760, textAlign: "center", textTransform: "uppercase", py: 0.5 }}>{day}</Typography>
          ))}
          {monthDays.map((day) => {
            const key = iso(day.date);
            const selectedDay = key === value;
            const isCurrentMonth = day.date.getMonth() === visibleMonth.getMonth();
            const isToday = key === iso(todayDate());
            return (
              <Button
                key={key}
                aria-label={`Choose ${formatDate(key, settings.dateFormat)} for ${label}`}
                onClick={() => chooseDate(key)}
                sx={{
                  minWidth: 0,
                  height: 36,
                  borderRadius: "6px",
                  color: selectedDay ? "#fff" : isCurrentMonth ? ink : muted,
                  bgcolor: selectedDay ? accent : isToday ? activeBg : "transparent",
                  border: isToday && !selectedDay ? `1px solid ${accent}` : "1px solid transparent",
                  fontSize: 12,
                  fontWeight: selectedDay || isToday ? 760 : 650,
                  opacity: isCurrentMonth ? 1 : 0.48,
                  "&:hover": { bgcolor: selectedDay ? accent : hoverBg }
                }}
              >
                {day.date.getDate()}
              </Button>
            );
          })}
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          <Button size="small" onClick={() => chooseDate(iso(todayDate()))} sx={{ color: accent, fontSize: 12 }}>Today</Button>
          <Button size="small" onClick={() => setAnchor(null)} sx={{ color: muted, fontSize: 12 }}>Close</Button>
        </Stack>
      </Menu>
    </Box>
  );
}

function validateProject(item: WorkItem, type: WorkTypeConfig, workTypeOptions: string[]) {
  if (!item.title.trim()) return "Project name is required.";
  if (!statusOptions.includes(item.status as ProjectStatus)) return "Choose a valid project status.";
  if (!workTypeOptions.some((option) => option.toLowerCase() === item.workType.trim().toLowerCase())) return "Choose a valid project tag.";
  if (!item.startDate || !item.dueDate) return "Start and due dates are required.";
  if (!isIsoDate(item.startDate) || !isIsoDate(item.dueDate)) return "Use valid start and due dates.";
  if (dateTime(item.startDate) > dateTime(item.dueDate)) return "Due date must be on or after start date.";
  if (type.earningsMode !== "batch" && safeMoneyValue(item.earnings) < 0) return "Earnings must be zero or higher.";
  const invalidLink = integrationServices.find((service) => {
    const link = item.integrationLinks?.[service.id];
    return link?.url && !isValidIntegrationUrl(link.url);
  });
  if (invalidLink) return `${invalidLink.name} needs a valid http or https URL.`;
  return "";
}

function normalizeProjectIntegrationLinks(links: IntegrationLinks | undefined): IntegrationLinks {
  const normalized: IntegrationLinks = {};
  for (const service of integrationServices) {
    const link = normalizeIntegrationLink(links?.[service.id]);
    if (!link.url && !link.label && !link.notes) continue;
    if (!isIntegrationServiceId(service.id)) continue;
    normalized[service.id] = link;
  }
  return normalized;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidProfileImageSource(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("data:image/") || isValidUrl(trimmed);
}

function validateIntegrationConfig(name: string, config: IntegrationConfig) {
  if (!config.account.trim()) return "Account email or name is required.";
  if (requiresAccountEmail(name) && !isValidEmail(config.account)) {
    return "Enter a valid account email address.";
  }
  if (name === "Slack" && config.webhookUrl.trim() && !isValidUrl(config.webhookUrl)) {
    return "Enter a valid webhook URL or leave it blank.";
  }
  return "";
}

function requiresAccountEmail(name: string) {
  return name === "Google Drive";
}

function projectStageIssues(stages: string[]) {
  if (stages.some((stage) => !stage.trim())) return "Workflow stages cannot be blank.";
  const normalized = stages.map((stage) => stage.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) return "Workflow stages must be unique.";
  return "";
}

function projectTagIssues(tags: string[]) {
  if (!tags.length) return "At least one project tag is required.";
  if (tags.some((tag) => !tag.trim())) return "Project tags cannot be blank.";
  const normalized = tags.map((tag) => tag.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) return "Project tags must be unique.";
  return "";
}

function nextStageName(stages: string[]) {
  const names = new Set(stages.map((stage) => stage.trim().toLowerCase()));
  let index = 1;
  while (names.has(`new stage ${index}`)) index += 1;
  return `New Stage ${index}`;
}

function nextProjectTagName(tags: string[]) {
  const names = new Set(tags.map((tag) => tag.trim().toLowerCase()));
  let index = 1;
  while (names.has(`custom tag ${index}`)) index += 1;
  return `Custom Tag ${index}`;
}


async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}






function getTypeConfig(label: string, settings: SettingsState) {
  if (isSalaryWorkType(label, settings)) return { label, earningsMode: "batch" as const };
  return profile.typeOptions.find((type) => type.label.toLowerCase() === label.toLowerCase()) ?? { label, earningsMode: "manual" as const };
}

function appSurfaceSx(settings: SettingsState) {
  const isCompact = settings.density === "Compact";

  return {
    transition: "background-color 160ms ease, color 160ms ease",
    "& .MuiPaper-root": {
      color: ink,
      backgroundColor: panel,
      borderColor: border
    },
    "& .MuiButton-root": {
      minHeight: isCompact ? 32 : undefined,
      transition: "background-color 160ms ease, color 160ms ease, border-color 160ms ease, transform 120ms ease",
      "&:active": { transform: "translateY(1px)" }
    },
    "& .MuiOutlinedInput-root": {
      minHeight: isCompact ? 36 : undefined,
      backgroundColor: "var(--app-control)",
      color: ink,
      "& fieldset": { borderColor: border },
      "&:hover fieldset": { borderColor: "var(--app-accent)" },
      "&.Mui-focused fieldset": { borderColor: "var(--app-accent)" }
    },
    "& .MuiInputLabel-root": {
      color: muted
    },
    "& .MuiSelect-icon": {
      color: muted
    },
    "& .MuiSwitch-track": {
      backgroundColor: "var(--app-strong-border)"
    },
    "& .MuiChip-root": {
      borderColor: border
    },
    "& .MuiDivider-root": {
      borderColor: border
    },
    "& .MuiLinearProgress-root": {
      backgroundColor: headerPanel
    },
    "& [data-density-panel]": {
      padding: isCompact ? "12px !important" : undefined
    },
    "& [data-density-row]": {
      paddingTop: isCompact ? "8px !important" : undefined,
      paddingBottom: isCompact ? "8px !important" : undefined
    }
  };
}

function applyRootThemeVariables(settings: SettingsState) {
  if (typeof document === "undefined") return;
  const { vars, isDark } = themeVariables(settings);
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.theme = isDark ? "dark" : "light";
  root.classList.toggle("dark", isDark);
  root.classList.toggle("cutlab-density-compact", settings.density === "Compact");
  root.classList.toggle("cutlab-density-comfortable", settings.density !== "Compact");
}

function themeVariables(settings: SettingsState) {
  const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const isDark = settings.theme === "Dark" || (settings.theme === "System" && prefersDark);

  return {
    isDark,
    vars: cutlabThemeVariables(isDark, settings.accentColor || defaultAccent)
  };
}

function defaultProjectNotes(settings: SettingsState) {
  const stages = settings.projectStages.filter((stage) => stage.trim()).join(" -> ");
  const stageLine = stages ? `Production checklist: ${stages}.` : "";
  return stageLine;
}

function normalizedSalaryBatchSize(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : defaultSalaryBatchSize;
}

function normalizedSalaryBatchAmount(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : defaultSalaryBatchAmount;
}

function projectWorkTypeOptions(settings: SettingsState, projects: WorkItem[] = []) {
  const values = [...settings.projectTags, settings.salaryWorkType, ...projects.map((project) => project.workType)];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.length ? result : [...defaultProjectTags];
}

function isSalaryWorkType(value: string, settings: SettingsState) {
  return value.trim().toLowerCase() === settings.salaryWorkType.trim().toLowerCase();
}

function canonicalWorkType(value: string, options: string[]) {
  const trimmed = value.trim();
  return options.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

function buildClientOptions(projects: WorkItem[], savedClients: string[] = []) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const savedClient of savedClients) {
    const client = savedClient.trim();
    const key = client.toLowerCase();
    if (!client || seen.has(key)) continue;
    seen.add(key);
    result.push(client);
  }
  for (const project of projects) {
    const client = project.client?.trim();
    const key = client?.toLowerCase();
    if (!client || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(client);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function findExistingClientName(value: string, clientOptions: string[]) {
  const key = value.trim().toLowerCase();
  if (!key) return "";
  return clientOptions.find((client) => client.toLowerCase() === key) ?? "";
}

function canonicalClientName(value: string, clientOptions: string[], forceExistingCapitalization = true) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const existing = findExistingClientName(trimmed, clientOptions);
  return existing && forceExistingCapitalization ? existing : trimmed;
}

function isSameClient(a: string | undefined, b: string) {
  return (a || "").trim().toLowerCase() === b.trim().toLowerCase();
}

function clientSuggestionText(value: string, clientOptions: string[]) {
  const trimmed = value.trim();
  const existing = findExistingClientName(trimmed, clientOptions);
  if (existing && existing !== trimmed) return `Will use existing client "${existing}" instead of creating a duplicate.`;
  return clientOptions.length ? "Select an existing client or type a new client name." : "Typing a client name creates it when the project is saved.";
}

function createId() {
  return window.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createdTime(item: WorkItem) {
  const parsed = Date.parse(item.createdAt || "");
  if (Number.isFinite(parsed)) return parsed;
  const legacyMatch = item.id.match(/^item-(\d+)/);
  if (legacyMatch) return Number(legacyMatch[1]);
  return dateTime(item.dueDate);
}

function fallbackCreatedAt(id: unknown, dueDate: string) {
  if (typeof id === "string") {
    const legacyMatch = id.match(/^item-(\d+)/);
    if (legacyMatch) return new Date(Number(legacyMatch[1])).toISOString();
  }
  return new Date(dateTime(dueDate)).toISOString();
}

function safeMoneyValue(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function dateTime(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function isDoneStatus(status: string) {
  return ["delivered", "done", "paid", "published", "closed", "archived", "shipped", "completed", "released"].some((word) => status.toLowerCase().includes(word));
}

function formatDate(value: string, dateFormat = defaultSettings.dateFormat) {
  const date = new Date(`${value}T00:00:00`);
  if (dateFormat === "Day Month Year") {
    return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }
  if (dateFormat === "YYYY-MM-DD") return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function profileDisplayName(settings: SettingsState) {
  return settings.profileName.trim() || "Your Profile";
}

function displayUsername(settings: SettingsState) {
  if (!settings.profileUsername.trim()) return "";
  return settings.profileUsername.startsWith("@") ? settings.profileUsername : `@${settings.profileUsername}`;
}

function sanitizeUsername(value: string) {
  const cleaned = value.trim().toLowerCase().replace(/^@+/, "").replace(/\s+/g, "");
  return cleaned.replace(/[^a-z0-9._-]/g, "");
}

function publicProfileSlug(settings: SettingsState) {
  const slug = sanitizeUsername(settings.profileUsername || settings.profileName || settings.studioName || "editor").slice(0, 40);
  return slug.length >= MIN_PUBLIC_SLUG_LENGTH ? slug : "editor";
}

function publicMetric(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function ProfileAvatar({ settings, size, fontSize }: { settings: SettingsState; size: number; fontSize: number }) {
  const imageUrl = settings.profileImageUrl.trim();

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: avatarSurface,
        border: `1px solid ${border}`,
        display: "grid",
        placeItems: "center",
        color: ink,
        fontSize,
        fontWeight: 760,
        overflow: "hidden",
        flexShrink: 0
      }}
    >
      {imageUrl ? (
        <Box component="img" src={imageUrl} alt={profileDisplayName(settings)} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials(settings.profileName)
      )}
    </Box>
  );
}

function money(value: number, currencyCode = defaultSettings.currencyCode) {
  return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode, maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value || 0);
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

