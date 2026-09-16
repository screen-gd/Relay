"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserProfile } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  useData,
  useProjectGroups,
  useProjectWorkflow,
} from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_PROFILE_ID, getProfile } from "@/lib/profiles";
import { useHydratedReducedMotion } from "@/lib/motion";
import type {
  Client,
  WorkItem,
  WorkTypeConfig,
  IntegrationConfig,
  ResourceLink,
  SavedProjectTemplate,
} from "@/lib/types";
import {
  useProjectController,
  useProjectCreationController,
} from "@/features/projects/project-controller";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { ProjectGroupsDialog } from "@/components/project-groups-dialog";
import { mergeClientRecords } from "@/lib/clients";
import {
  validateWorkflowStages,
  workflowStagesFromLabels,
} from "@/lib/workflow-templates";
import {
  PROJECT_STATUS_VALUES,
  TEAM_ROLE_VALUES,
  type FileCategory,
  type FileStatus,
  type ProjectStatus,
  type SettingsTeamRole,
  type StoredTeamRole,
} from "@/lib/domain-values";
import type {
  IntegrationLink,
  IntegrationLinks,
  IntegrationServiceId,
} from "@/lib/integrations";
import {
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/lib/project-templates";
import { normalizeOptionalTimecode } from "@/lib/timecode";
import {
  configuredIntegrationCount,
  emptyIntegrationLink,
  hasIntegrationLink,
  integrationDisplayText,
  integrationServices,
  integrationStatusLabel,
  isIntegrationServiceId,
  isValidIntegrationUrl,
  normalizeIntegrationLink,
} from "@/lib/integrations";
import { relay } from "./design-system";
import { RelayBrand } from "./relay-brand";
import { emptyStateAssetFor, emptyStateAssets } from "./brand-assets";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  ContentSection,
  FillViewport,
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageContent,
  PageEmptyState,
  PageHeader,
  PageToolbar,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { PrecisionDashboard } from "@/components/precision-dashboard";
import { PrecisionProjects } from "@/components/precision-projects";
import { ProjectWorkspace } from "@/features/projects/project-workspace";
import {
  DeleteProjectDialog,
  ProjectDialog,
} from "@/features/projects/project-dialogs";
import { createProjectPort } from "@/features/projects/project-port";
import {
  canDeleteProject as projectCanBeDeleted,
  resolveProjectPermissions,
} from "@/features/projects/project-permissions";
import {
  projectHref,
  type ProjectActivityEvent,
} from "@/features/projects/project-view";
import {
  useProjectsApplicationState,
  type DueFilter,
  type ProjectDashboardActivity as DashboardActivity,
} from "@/features/projects/use-projects-application-state";
import {
  PrecisionCalendar,
  PrecisionTimeline,
} from "@/components/precision-schedule";
import { PrecisionFiles } from "@/components/precision-files";
import {
  PrecisionClients,
  PrecisionFeedback,
  PrecisionReports,
} from "@/components/precision-workspaces";
import { PrecisionMedia } from "@/components/precision-media";
import { SalaryPlansPanel } from "@/components/salary-plans-panel";
import { FirstRunChecklist } from "@/components/first-run-checklist";
import { SampleModeBar } from "@/components/sample-mode-bar";
import {
  CapabilityUpgradePrompt,
  ClerkPricingPlans,
} from "@/components/subscription-plans";
import {
  resolveOnboardingVariant,
  trackOnboardingEvent,
  type OnboardingVariant,
} from "@/lib/onboarding";
import { buildPayoutReport } from "@/lib/payout-reporting";
import {
  buildWorkspaceSearchIndex,
  type WorkspaceFile,
  type WorkspaceOutput,
} from "@/features/workspace-discovery/workspace-discovery";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  trackOptionalEvent,
  type AnalyticsConsent,
} from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import {
  AlertDialog as OwnedAlertDialog,
  AlertDialogAction as OwnedAlertDialogAction,
  AlertDialogCancel as OwnedAlertDialogCancel,
  AlertDialogContent as OwnedAlertDialogContent,
  AlertDialogDescription as OwnedAlertDialogDescription,
  AlertDialogFooter as OwnedAlertDialogFooter,
  AlertDialogHeader as OwnedAlertDialogHeader,
  AlertDialogTitle as OwnedAlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  AccountSettingsPage,
  AppToast,
  AnalyticsConsentDialog,
  applyRootThemeVariables,
  AppLoadingStatus,
  canonicalClientName,
  canonicalWorkType,
  createId,
  createdTime,
  dateTime,
  daysBetween,
  defaultProjectNotes,
  dueBucket,
  displayUsername,
  formatDate,
  findExistingClientName,
  getTypeConfig,
  IntegrationLinkManager,
  IntegrationsDesignPage,
  isDoneStatus,
  isIsoDate,
  isSalaryWorkType,
  iso,
  money,
  normalizeChecklistCompleted,
  normalizeProjectIntegrationLinks,
  normalizedSalaryBatchAmount,
  normalizedSalaryBatchSize,
  NotificationBell,
  OrganizationProfilePage,
  ProfileDesignPage,
  ProfileEditPage,
  projectWorkTypeOptions,
  publicMetric,
  publicProfileSlug,
  ResourcesDesignPage,
  safeMoneyValue,
  sanitizeUsername,
  SettingsDesignPage,
  SubscriptionPage,
  TeamChatPage,
  TeamDesignPage,
  TemplatesDesignPage,
  todayDate,
  validateProject,
  WelcomeChoiceDialog,
} from "@/features/routes/remaining-routes";

const teamApi = {
  updateWorkspaceSettings: makeFunctionReference<
    "mutation",
    {
      teamId: string;
      name: string;
      currencyCode: string;
      timeZone: string;
      defaultWorkflowTemplateId?: string;
      allowAllTeamProjects: boolean;
    },
    null
  >("team:updateWorkspaceSettings"),
  updateMemberPermissions: makeFunctionReference<
    "mutation",
    {
      teamId: string;
      memberId: string;
      permissions: Record<string, boolean>;
    },
    null
  >("team:updateMemberPermissions"),
  transferOwnership: makeFunctionReference<
    "mutation",
    { teamId: string; memberId: string },
    null
  >("team:transferOwnership"),
};
const workspaceDiscoveryApi = {
  list: makeFunctionReference<
    "query",
    { includeArchived?: boolean },
    { outputs: WorkspaceOutput[]; files: WorkspaceFile[] }
  >("workspaceDiscovery:list"),
};
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { Card as OwnedCard } from "@/components/ui/card";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  DropdownMenu as OwnedDropdownMenu,
  DropdownMenuContent as OwnedDropdownMenuContent,
  DropdownMenuSeparator as OwnedDropdownMenuSeparator,
  DropdownMenuTrigger as OwnedDropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  BadgeDollarSign,
  Bell,
  Building2,
  Check,
  CircleCheckBig,
  Clock3,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe2,
  History,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Palette,
  Pencil,
  Play,
  Plug,
  Plus,
  Send,
  Share2,
  Trash2,
  Unplug,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ProjectSelect } from "@/features/projects/project-select";

const defaultProjectTags = ["Job / Salary", "Freelance", "Personal Channel"];
const defaultSalaryWorkType = "Job / Salary";
const defaultSalaryBatchSize = 20;
const defaultSalaryBatchAmount = 10000;
// Compatibility identifier: keep the persisted key so existing local workspaces stay readable.
const AUTH_MODE_STORAGE_KEY = "cutlab-studio:auth-mode:v1";
const TEAM_WORKSPACE_NAME_LIMIT = 80;
const TEAM_CHAT_MESSAGE_LIMIT = 800;
const TEAM_PROJECT_COMMENT_LIMIT = 1000;
const TEAM_INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const TEAM_MEMBER_PERMISSION_LABELS = [
  ["viewProjects", "View Projects"],
  ["editProjects", "Edit Projects"],
  ["reviewProjects", "Reviews"],
  ["managePortal", "Client Portals"],
  ["manageFinance", "Finance"],
] as const;
const MIN_PUBLIC_SLUG_LENGTH = 2;
// Compatibility identifier: keep the persisted key so existing local activity stays readable.
const LOCAL_PROJECT_ACTIVITY_STORAGE_KEY = "cutlab-studio:project-activity:v1";
const headingFont = relay.font.heading;
const defaultAccent = relay.color.teal;
const accent = `var(--app-accent, ${relay.color.teal})`;
const ink = `var(--app-ink, ${relay.color.softWhite})`;
const border = "var(--app-border)";
const canvas = `var(--app-canvas, ${relay.color.charcoal})`;
const activeBg = "var(--app-active, rgba(45,140,151,0.18))";
const successColor = `var(--app-success, ${relay.color.success})`;
const warningColor = `var(--app-warning, ${relay.color.warning})`;

type PageKey =
  | "dashboard"
  | "projects"
  | "project"
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
type TeamMember = {
  id: string;
  name: string;
  role: StoredTeamRole;
  email: string;
};
type TeamWorkspaceContract = {
  _id: string;
  ownerUserId: string;
  name: string;
  inviteCode: string;
  allowAllTeamProjects?: boolean;
  currencyCode?: string;
  timeZone?: string;
  defaultWorkflowTemplateId?: string;
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
  clients: Client[];
  customProjectTemplates: SavedProjectTemplate[];
  projectTags: string[];
  salaryWorkType: string;
  salaryBatchSize: number;
  salaryBatchAmount: number;
  projectStages: string[];
  notifications: Record<string, boolean>;
  integrationConfigs: Record<string, IntegrationConfig>;
  integrationLinks: IntegrationLinks;
  teamRole: SettingsTeamRole;
  teamMembers: TeamMember[];
  rolePermissions: Record<string, Record<string, boolean>>;
  theme: string;
  accentColor: string;
};
type ToastState = {
  message: string;
  tone: "success" | "info" | "warning";
};

const profile = getProfile(DEFAULT_PROFILE_ID);

const statusOptions: ProjectStatus[] = [...PROJECT_STATUS_VALUES];

const teamRoleOptions = [...TEAM_ROLE_VALUES];
const currencyOptions = ["USD", "EUR", "GBP", "INR", "AED", "SAR"];
const currencyLabels: Record<string, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  INR: "INR (Rs)",
  AED: "AED (Dh)",
  SAR: "SAR (SR)",
};
const resourceCategories = [
  "Asset Folder",
  "Raw Footage",
  "Music / SFX",
  "Brand Assets",
  "Review Link",
  "Reference",
  "Other",
];

const permissionKeys = [
  "Create and edit projects",
  "Upload media and assets",
  "Manage project stages",
  "Invite team members",
  "Manage app settings",
];

const defaultRolePermissions: Record<string, Record<string, boolean>> = {
  Owner: Object.fromEntries(permissionKeys.map((k) => [k, true])),
  Editor: Object.fromEntries(
    permissionKeys.map((k) => [
      k,
      ["Create and edit projects", "Upload media and assets"].includes(k),
    ])
  ),
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
  lastSyncAt: "",
};

const integrationNames = ["Google Drive", "Dropbox", "Slack", "Frame.io"];

const defaultIntegrationConfigs: Record<string, IntegrationConfig> =
  Object.fromEntries(
    integrationNames.map((name) => [name, { ...emptyIntegrationConfig }])
  );

const integrationDescriptions: Record<string, string> = {
  "Google Drive": "Save Google Drive folder and file links for project assets.",
  Dropbox: "Save Dropbox folder and delivery package links.",
  Slack: "Save Slack channel or message links for project discussion.",
  "Frame.io": "Save Frame.io review links and approval pages.",
};

const integrationIcons: Record<string, string> = {
  "Google Drive": "G",
  Dropbox: "D",
  Slack: "S",
  "Frame.io": "F",
};

const integrationColors: Record<string, string> = {
  "Google Drive": "var(--brand-google-drive)",
  Dropbox: "var(--brand-dropbox)",
  Slack: "var(--brand-slack)",
  "Frame.io": "var(--brand-frame-io)",
};

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
  clients: [],
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
    "Weekly summary": false,
  },
  integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)),
  integrationLinks: {},
  teamRole: "",
  teamMembers: [],
  rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
  theme: "Dark",
  accentColor: defaultAccent,
};

const SettingsContext = createContext<SettingsState>(defaultSettings);

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
  integrationLinks: {},
});

export function TrackerApp({
  page,
  projectId,
  projectView,
  experienceMode = "workspace",
}: {
  page: PageKey;
  projectId?: string;
  projectView?: string;
  experienceMode?: "workspace" | "sample";
}) {
  const {
    items,
    setItems,
    settings,
    setSettings,
    resourceLinks,
    setResourceLinks,
    salaryBatches,
    salaryPlans,
    isAuthEnabled,
    isSignedIn,
    isAuthLoaded,
    toast,
    setToast,
    updateSalaryBatchPayment,
  } = useData();
  const workflow = useProjectWorkflow();
  const projectPort = useMemo(() => createProjectPort(setItems), [setItems]);
  const {
    groups: projectGroups,
    saveGroup: saveProjectGroup,
    setGroupArchived,
  } = useProjectGroups();
  const router = useRouter();
  const {
    isLoaded: clerkAuthLoaded,
    isSignedIn: clerkIsSignedIn,
    openSignIn,
    openSignUp,
  } = useOptionalAuth();
  const isSample = experienceMode === "sample";
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const shouldLoadTeamPermissions = Boolean(
    isSignedIn && isConvexAuthenticated
  );
  const teamData = useQuery(
    api.team.getMyWorkspace,
    shouldLoadTeamPermissions ? {} : "skip"
  );
  const workspaceSubscription = useQuery(
    api.workspaceSubscriptions.getCurrent,
    shouldLoadTeamPermissions ? {} : "skip"
  );
  const workspaceDiscovery = useQuery(
    workspaceDiscoveryApi.list,
    shouldLoadTeamPermissions ? {} : "skip"
  );
  const {
    activeProjectView,
    setActiveProjectView,
    dialogOpen,
    setDialogOpen,
    newProjectOpen,
    setNewProjectOpen,
    newProjectTemplateId,
    setNewProjectTemplateId,
    projectGroupsOpen,
    setProjectGroupsOpen,
    projectGroupsScope,
    setProjectGroupsScope,
    projectStartScope,
    setProjectStartScope,
    editingId,
    setEditingId,
    detailProjectId,
    setDetailProjectId,
    deleteTarget,
    setDeleteTarget,
    form,
    setForm,
    formError,
    setFormError,
    projectLauncherTriggerRef,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    kindFilter,
    setKindFilter,
    clientFilter,
    setClientFilter,
    dueFilter,
    setDueFilter,
    billingFilter,
    setBillingFilter,
    sortKey,
    setSortKey,
    dashboardActivity,
    setDashboardActivity,
    localProjectActivity,
    setLocalProjectActivity,
  } = useProjectsApplicationState({
    projectId,
    projectView,
    sample: isSample,
    activityStorageKey: LOCAL_PROJECT_ACTIVITY_STORAGE_KEY,
    createEmptyForm: emptyForm,
  });
  const [authChoiceOpen, setAuthChoiceOpen] = useState(false);
  const [analyticsConsentOpen, setAnalyticsConsentOpen] = useState(false);
  const [onboardingVariant, setOnboardingVariant] =
    useState<OnboardingVariant>("v2");
  const onboardingStartedAt = useRef(Date.now());
  useEffect(() => {
    applyRootThemeVariables(settings);
  }, [settings]);

  useEffect(() => {
    if (isSample) {
      setOnboardingVariant("v2");
      trackOnboardingEvent("sample_studio_opened", {
        variant: "v2",
        entrySource: "first_run_dialog",
      });
      return;
    }
    setOnboardingVariant(resolveOnboardingVariant());
  }, [isSample]);

  useEffect(() => {
    if (typeof window === "undefined" || isSample) return;
    if (clerkIsSignedIn || isSignedIn) {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "account");
      setAuthChoiceOpen(false);
      return;
    }
    if (!clerkAuthLoaded || !isAuthLoaded) {
      setAuthChoiceOpen(false);
      return;
    }

    const savedMode = window.localStorage.getItem(AUTH_MODE_STORAGE_KEY);
    setAuthChoiceOpen(!savedMode);
  }, [clerkAuthLoaded, clerkIsSignedIn, isAuthLoaded, isSample, isSignedIn]);

  useEffect(() => {
    if (!authChoiceOpen) return;
    trackOnboardingEvent("onboarding_dialog_viewed", {
      variant: onboardingVariant,
      entrySource: "workspace_root",
    });
  }, [authChoiceOpen, onboardingVariant]);

  useEffect(() => {
    trackOptionalEvent("weekly_return", {
      mode: isSignedIn ? "account" : "local",
    });
  }, [isSignedIn]);

  const projects = useMemo(
    () =>
      items.filter(
        (item) => (item.profileId || DEFAULT_PROFILE_ID) === profile.id
      ),
    [items]
  );
  const personalProjects = useMemo(
    () => projects.filter((item) => !item.teamId),
    [projects]
  );

  const activeTeamMembers = useMemo(
    () =>
      teamData?.members.filter((member) => member.status === "active") ?? [],
    [teamData]
  );
  const teamDataLoading = Boolean(
    isSignedIn &&
    (isConvexAuthLoading || (isConvexAuthenticated && teamData === undefined))
  );
  const teamSyncUnavailable = Boolean(
    isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated
  );
  const currentTeamId = teamData?.workspace?._id;
  const teamProjects = useMemo(
    () =>
      currentTeamId
        ? projects.filter((project) => project.teamId === currentTeamId)
        : [],
    [currentTeamId, projects]
  );
  const teamWorkspace = teamData?.workspace as
    TeamWorkspaceContract | undefined;
  const teamStats = useMemo(() => {
    const deliveredProjects = teamProjects.filter((project) =>
      isDoneStatus(project.status)
    );
    return {
      active: teamProjects.length - deliveredProjects.length,
      delivered: deliveredProjects.length,
      earned: deliveredProjects.reduce(
        (total, project) => total + safeMoneyValue(project.earnings),
        0
      ),
      salaryEdits: deliveredProjects.filter((project) =>
        isSalaryWorkType(project.workType, settings)
      ).length,
    };
  }, [settings, teamProjects]);
  const {
    canCreateTeamProjects,
    canCreateProjects,
    canEditProjects,
    canUpdateProjectStatus,
    canCommentProjects,
    canManagePortals,
    canManageFinance,
    canManageTeamProjects,
  } = resolveProjectPermissions({
    sample: isSample,
    teamConnected: Boolean(teamData),
    loading: teamDataLoading,
    unavailable: teamSyncUnavailable,
    role: teamData?.currentMember.role,
    permissions: teamData?.currentMember.permissions,
  });
  const customWorkflowTemplatesLocked = Boolean(
    isSignedIn &&
    isConvexAuthenticated &&
    workspaceSubscription &&
    !workspaceSubscription.capabilities.customWorkflowTemplates
  );
  const salaryPlansCapabilityEnabled = Boolean(
    !isAuthEnabled ||
    !isSignedIn ||
    workspaceSubscription?.capabilities.salaryPlans
  );
  const clientHubCapabilityEnabled = Boolean(
    !isAuthEnabled ||
    !isSignedIn ||
    workspaceSubscription?.capabilities.clientHub
  );
  const customPortalBrandingCapabilityEnabled = Boolean(
    !isAuthEnabled ||
    !isSignedIn ||
    workspaceSubscription?.capabilities.customPortalBranding
  );

  useEffect(() => {
    if (!teamWorkspace) return;
    const next = {
      ...settings,
      studioName: teamWorkspace.name,
      currencyCode: teamWorkspace.currencyCode || settings.currencyCode,
      timeZone: teamWorkspace.timeZone || settings.timeZone,
    };
    if (
      next.studioName === settings.studioName &&
      next.currencyCode === settings.currencyCode &&
      next.timeZone === settings.timeZone
    )
      return;
    setSettings((current) => ({
      ...current,
      studioName: next.studioName,
      currencyCode: next.currencyCode,
      timeZone: next.timeZone,
    }));
  }, [
    setSettings,
    settings.currencyCode,
    settings.studioName,
    settings.timeZone,
    teamWorkspace,
  ]);
  const detailProject = useMemo(
    () => items.find((item) => item.id === detailProjectId) ?? null,
    [detailProjectId, items]
  );
  const projectTagOptions = useMemo(
    () => projectWorkTypeOptions(settings, projects),
    [projects, settings]
  );
  const filterProjectTagOptions = useMemo(
    () => ["ALL", ...projectTagOptions],
    [projectTagOptions]
  );
  const clientRecords = useMemo(
    () =>
      mergeClientRecords(settings.clients, [
        ...settings.customClients,
        ...projects.flatMap((project) =>
          project.client ? [project.client] : []
        ),
      ]),
    [projects, settings.clients, settings.customClients]
  );
  const clientOptions = useMemo(
    () =>
      clientRecords
        .filter((client) => !client.archived)
        .map((client) => client.name),
    [clientRecords]
  );
  const workflowTemplates = useMemo(
    () => [...PROJECT_TEMPLATES, ...settings.customProjectTemplates],
    [settings.customProjectTemplates]
  );
  const workspaceSearchRecords = useMemo(
    () =>
      buildWorkspaceSearchIndex({
        clients: clientRecords,
        groups: projectGroups,
        projects,
        outputs: workspaceDiscovery?.outputs ?? [],
        files: workspaceDiscovery?.files ?? [],
      }),
    [
      clientRecords,
      projectGroups,
      projects,
      workspaceDiscovery?.files,
      workspaceDiscovery?.outputs,
    ]
  );

  useEffect(() => {
    if (!teamWorkspace?.defaultWorkflowTemplateId) return;
    if (
      workflowTemplates.some(
        (template) => template.id === teamWorkspace.defaultWorkflowTemplateId
      )
    ) {
      setNewProjectTemplateId(teamWorkspace.defaultWorkflowTemplateId);
    }
  }, [teamWorkspace?.defaultWorkflowTemplateId, workflowTemplates]);

  useEffect(() => {
    if (JSON.stringify(settings.clients) === JSON.stringify(clientRecords))
      return;
    setSettings((current) => ({ ...current, clients: clientRecords }));
  }, [clientRecords, setSettings, settings.clients]);
  const isClientBillableProject = useCallback(
    (item: WorkItem) =>
      !isSalaryWorkType(item.workType, settings) &&
      isDoneStatus(item.status) &&
      safeMoneyValue(item.earnings) > 0,
    [settings]
  );
  const isProjectPaid = useCallback(
    (item: WorkItem) => isClientBillableProject(item) && Boolean(item.paid),
    [isClientBillableProject]
  );
  const isProjectUnpaid = useCallback(
    (item: WorkItem) => isClientBillableProject(item) && !item.paid,
    [isClientBillableProject]
  );
  const filteredProjects = useMemo(() => {
    const searched = projects.filter((item) => {
      const haystack =
        `${item.title} ${item.client || ""} ${item.notes} ${item.workType}`.toLowerCase();
      const matchesSearch =
        !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      const matchesKind =
        kindFilter === "ALL" ||
        item.workType.trim().toLowerCase() === kindFilter.toLowerCase();
      const matchesClient =
        clientFilter === "ALL" ||
        item.client?.trim().toLowerCase() === clientFilter.toLowerCase();
      const matchesDue = dueFilter === "ALL" || dueBucket(item) === dueFilter;
      const isPaid = isProjectPaid(item);
      const isUnpaid = isProjectUnpaid(item);
      const matchesBilling =
        billingFilter === "ALL" ||
        (billingFilter === "Paid" && isPaid) ||
        (billingFilter === "Unpaid" && isUnpaid);
      return (
        matchesSearch &&
        matchesStatus &&
        matchesKind &&
        matchesClient &&
        matchesDue &&
        matchesBilling
      );
    });

    return [...searched].sort((a, b) => {
      if (sortKey === "createdAt_asc") return createdTime(a) - createdTime(b);
      if (sortKey === "dueDate_asc")
        return (
          dateTime(a.dueDate || "9999-12-31") -
          dateTime(b.dueDate || "9999-12-31")
        );
      if (sortKey === "earnings_desc")
        return safeMoneyValue(b.earnings) - safeMoneyValue(a.earnings);
      if (sortKey === "earnings_asc")
        return safeMoneyValue(a.earnings) - safeMoneyValue(b.earnings);
      return createdTime(b) - createdTime(a);
    });
  }, [
    billingFilter,
    clientFilter,
    dueFilter,
    isProjectPaid,
    isProjectUnpaid,
    kindFilter,
    projects,
    query,
    sortKey,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    const moneyReport = buildPayoutReport({
      projects: personalProjects,
      salaryBatches,
      salaryWorkType: settings.salaryWorkType,
      salaryBatchAmount: normalizedSalaryBatchAmount(
        settings.salaryBatchAmount
      ),
      profileName: settings.profileName,
      period: "all",
    });
    const unpaid = personalProjects.filter((item) =>
      isProjectUnpaid(item)
    ).length;
    const active = personalProjects.filter(
      (item) => !isDoneStatus(item.status)
    ).length;
    const salaryBatchSize = normalizedSalaryBatchSize(settings.salaryBatchSize);
    const deliveredSalaryProjects = personalProjects.filter(
      (item) =>
        isSalaryWorkType(item.workType, settings) && isDoneStatus(item.status)
    );
    const settledProjectIds = new Set(
      salaryBatches.flatMap((batch) => batch.projectIds ?? [])
    );
    const unsettledSalaryProjects = deliveredSalaryProjects.filter(
      (project) => !settledProjectIds.has(project.id)
    );
    const salaryEdits = deliveredSalaryProjects.length;
    const delivered = personalProjects.filter((item) =>
      isDoneStatus(item.status)
    );
    const avgTurnaroundDays = delivered.length
      ? Math.round(
          delivered.reduce(
            (total, item) => total + daysBetween(item.startDate, item.dueDate),
            0
          ) / delivered.length
        )
      : 0;
    return {
      total: personalProjects.length,
      active,
      unpaid,
      earned: moneyReport.earned,
      collected: moneyReport.collected,
      outstanding: moneyReport.outstanding,
      salaryEdits,
      salaryBatchProgress: unsettledSalaryProjects.length % salaryBatchSize,
      delivered: delivered.length,
      avgTurnaroundDays,
    };
  }, [
    isProjectUnpaid,
    personalProjects,
    salaryBatches,
    settings.profileName,
    settings.salaryBatchAmount,
    settings.salaryBatchSize,
    settings.salaryWorkType,
  ]);

  function rememberProjectLauncherTrigger() {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      projectLauncherTriggerRef.current = document.activeElement;
    }
  }

  function openNewProject(scope: "personal" | "team" = "personal") {
    if (scope === "team" && !canCreateTeamProjects) {
      notify("Your team role cannot create projects.", "warning");
      return;
    }
    if (scope === "team" && !currentTeamId) {
      notify(
        "Create or join a team workspace before adding team projects.",
        "warning"
      );
      return;
    }
    rememberProjectLauncherTrigger();
    setProjectStartScope(scope);
    setNewProjectTemplateId("relay-default-workflow");
    setNewProjectOpen(true);
  }

  function openBlankProject(scope: "personal" | "team" = projectStartScope) {
    rememberProjectLauncherTrigger();
    setProjectStartScope(scope);
    setNewProjectTemplateId("");
    setNewProjectOpen(true);
  }

  function notify(message: string, tone: ToastState["tone"] = "success") {
    setToast({ message, tone });
  }

  function logLocalProjectActivity(
    event: Omit<ProjectActivityEvent, "id" | "actorName" | "createdAt"> & {
      actorName?: string;
      createdAt?: string;
    }
  ) {
    setLocalProjectActivity((current) =>
      [
        {
          ...event,
          id: createId(),
          actorName: event.actorName ?? (settings.profileName || "Local user"),
          createdAt: event.createdAt ?? new Date().toISOString(),
        },
        ...current,
      ].slice(0, 500)
    );
  }

  function chooseLocalMode() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "local");
    }
    setAuthChoiceOpen(false);
    if (getAnalyticsConsent() === "unknown") setAnalyticsConsentOpen(true);
    trackOnboardingEvent("workspace_mode_selected", {
      variant: onboardingVariant,
      mode: "local",
      elapsedMs: Date.now() - onboardingStartedAt.current,
    });
    notify("Using local mode on this device.", "info");
  }

  function launchAccountFlow(mode: "sign-up" | "sign-in") {
    if (!isAuthEnabled) {
      setAuthChoiceOpen(false);
      notify(
        "Sign-in is unavailable until Clerk and Convex are configured.",
        "warning"
      );
      return;
    }
    setAuthChoiceOpen(false);
    trackOnboardingEvent("workspace_mode_selected", {
      variant: onboardingVariant,
      mode: "account",
      elapsedMs: Date.now() - onboardingStartedAt.current,
    });
    if (mode === "sign-up") {
      openSignUp();
      return;
    }
    openSignIn();
  }

  function openTemplateProject(
    template: ProjectTemplate,
    scope: "personal" | "team" = projectStartScope
  ) {
    if (!canCreateProjects) {
      notify("Your team role cannot create projects.", "warning");
      return;
    }
    if (scope === "team" && (!canCreateTeamProjects || !currentTeamId)) {
      notify(
        "Your team role cannot create projects in this workspace.",
        "warning"
      );
      return;
    }
    rememberProjectLauncherTrigger();
    setProjectStartScope(scope);
    setNewProjectTemplateId(template.id);
    setNewProjectOpen(true);
  }

  function openEditProject(item: WorkItem) {
    if (item.teamId && !canEditProjects) {
      notify("Your team role cannot edit team projects.", "warning");
      return;
    }
    setEditingId(item.id);
    setForm(item);
    setFormError("");
    setDialogOpen(true);
  }

  function openProjectDetails(item: WorkItem) {
    if (isSample) {
      trackOnboardingEvent("sample_project_opened", {
        variant: "v2",
        entrySource: "sample_dashboard",
      });
    }
    router.push(projectHref({ projectId: item.id, sample: isSample }));
  }

  function canDeleteProject(project: WorkItem | null) {
    return projectCanBeDeleted({
      project,
      currentUserId: teamData?.currentMember.userId,
      canEdit: canEditProjects,
      canManageTeam: canManageTeamProjects,
    });
  }

  function requestDeleteProject(id: string) {
    const target = items.find((item) => item.id === id);
    if (target && !canDeleteProject(target)) {
      notify(
        "Only the project owner or a team owner can delete this team project.",
        "warning"
      );
      return;
    }
    if (target) setDeleteTarget(target);
  }

  const { archiveProject, updateProjectStatus } = useProjectController({
    projects: projectPort,
    canEditTeamProjects: canEditProjects,
    canUpdateTeamStatus: canUpdateProjectStatus,
    salaryWorkType: settings.salaryWorkType,
    currencyCode: settings.currencyCode,
    workflow,
    confirmDelivery: (message) => window.confirm(message),
    notify,
    onStatusChanged: (project, previousStatus) => {
      const status = project.status;
      if (isDoneStatus(status) && !isDoneStatus(previousStatus)) {
        trackOptionalEvent("project_delivered", {
          mode: isSignedIn ? "account" : "local",
        });
      }
      setDashboardActivity((current) => {
        const activity: DashboardActivity = {
          id: createId(),
          kind: isDoneStatus(status) ? "delivered" : "status",
          message: isDoneStatus(status)
            ? `${project.title} was delivered`
            : `${project.title} moved to ${status}`,
          projectId: project.id,
          createdAt: new Date().toISOString(),
        };
        return [activity, ...current].slice(0, 20);
      });
      logLocalProjectActivity({
        projectId: project.id,
        kind: "status_changed",
        message: `${project.title} status changed from ${previousStatus} to ${status}.`,
      });
    },
  });

  const createProject = useProjectCreationController({
    clients: clientRecords,
    projectGroups,
    workflowTemplates,
    salaryPlans,
    projectTags: settings.projectTags,
    salaryWorkType: settings.salaryWorkType,
    profileId: profile.id,
    baseNotes: defaultProjectNotes(settings),
    scope: projectStartScope,
    teamId: currentTeamId,
    ownerUserId: teamData?.currentMember.userId,
    projects: projectPort,
    notify,
    onCreated: (project) => {
      const activity: DashboardActivity = {
        id: createId(),
        kind: "created",
        message: `${project.title} was created`,
        projectId: project.id,
        createdAt: project.createdAt,
      };
      setDashboardActivity((current) => [activity, ...current].slice(0, 20));
      logLocalProjectActivity({
        projectId: project.id,
        kind: "project_created",
        message: `${project.title} was created.`,
        createdAt: project.createdAt,
      });
      trackOnboardingEvent("first_project_created", {
        variant: onboardingVariant,
        mode: isSignedIn ? "account" : "local",
        elapsedMs: Date.now() - onboardingStartedAt.current,
      });
      setNewProjectOpen(false);
      notify("Project created.");
      router.push(projectHref({ projectId: project.id }));
    },
  });

  function updateProjectPayment(project: WorkItem, paid: boolean) {
    if (project.teamId && !canManageFinance) {
      notify("Your team role cannot manage project payments.", "warning");
      return;
    }
    if (!isClientBillableProject(project)) {
      notify(
        "Only delivered billable client projects can be marked paid.",
        "warning"
      );
      return;
    }
    const paidDate = paid ? new Date().toISOString() : "";
    projectPort.update(project.id, (item) => ({ ...item, paid, paidDate }));
    logLocalProjectActivity({
      projectId: project.id,
      kind: "project_updated",
      message: `${project.title} was marked ${paid ? "paid" : "unpaid"}.`,
    });
    notify(`${project.title} marked ${paid ? "paid" : "unpaid"}.`);
  }

  function confirmDeleteProject() {
    if (!deleteTarget) return;
    projectPort.remove(deleteTarget.id);
    setLocalProjectActivity((current) =>
      current.filter((event) => event.projectId !== deleteTarget.id)
    );
    if (detailProjectId === deleteTarget.id) setDetailProjectId("");
    setDeleteTarget(null);
    notify("Project deleted.", "warning");
  }

  function saveProject() {
    const canonicalClient = canonicalClientName(
      form.client || "",
      clientOptions
    );
    const clientRecord =
      clientRecords.find(
        (client) => client.name.toLowerCase() === canonicalClient.toLowerCase()
      ) ?? mergeClientRecords([], [canonicalClient])[0];
    const normalizedWorkType = canonicalWorkType(
      form.workType,
      projectTagOptions
    );
    const normalizedForm = {
      ...form,
      client: canonicalClient,
      workType: normalizedWorkType,
      integrationLinks: normalizeProjectIntegrationLinks(form.integrationLinks),
    };
    const typeConfig = getTypeConfig(normalizedForm.workType, settings);
    const error = validateProject(
      normalizedForm,
      typeConfig,
      projectTagOptions
    );
    if (error) {
      setFormError(error);
      return;
    }
    const payload: WorkItem = {
      ...normalizedForm,
      title: normalizedForm.title.trim(),
      id: editingId || createId(),
      teamId: normalizedForm.teamId,
      ownerUserId:
        normalizedForm.ownerUserId ??
        (!editingId && normalizedForm.teamId
          ? teamData?.currentMember.userId
          : undefined),
      assigneeUserIds: normalizedForm.assigneeUserIds ?? [],
      createdAt: form.createdAt || new Date().toISOString(),
      profileId: profile.id,
      client: normalizedForm.client?.trim() || "",
      clientId: clientRecord?.id,
      notes: normalizedForm.notes.trim(),
      earnings:
        typeConfig.earningsMode === "batch"
          ? 0
          : safeMoneyValue(normalizedForm.earnings),
      paid:
        typeConfig.earningsMode === "batch"
          ? false
          : Boolean(normalizedForm.paid),
      paidDate:
        typeConfig.earningsMode === "batch" || !normalizedForm.paid
          ? ""
          : normalizedForm.paidDate || new Date().toISOString(),
      checklistCompleted: normalizeChecklistCompleted(
        normalizedForm.checklistItems,
        normalizedForm.checklistCompleted
      ),
      integrationLinks: normalizedForm.integrationLinks,
    };
    if (
      clientRecord &&
      !settings.clients.some((client) => client.id === clientRecord.id)
    ) {
      setSettings((current) => ({
        ...current,
        customClients: [...current.customClients, clientRecord.name],
        clients: [...current.clients, clientRecord],
      }));
    }
    if (editingId) projectPort.replace(payload);
    else projectPort.add(payload);
    if (!editingId) {
      trackOnboardingEvent("first_project_created", {
        variant: onboardingVariant,
        mode: isSignedIn ? "account" : "local",
        elapsedMs: Date.now() - onboardingStartedAt.current,
      });
    }
    setDashboardActivity((current) => {
      const activity: DashboardActivity = {
        id: createId(),
        kind: editingId ? "updated" : "created",
        message: editingId
          ? `${payload.title} was updated`
          : `${payload.title} was created`,
        projectId: payload.id,
        createdAt: new Date().toISOString(),
      };
      return [activity, ...current].slice(0, 20);
    });
    logLocalProjectActivity({
      projectId: payload.id,
      kind: editingId ? "project_updated" : "project_created",
      message: editingId
        ? `${payload.title} was updated.`
        : `${payload.title} was created.`,
      createdAt: editingId ? undefined : payload.createdAt,
    });
    setDialogOpen(false);
    setEditingId("");
    setForm(emptyForm());
    notify(editingId ? "Project updated." : "Project created.");
    if (!editingId) router.push(projectHref({ projectId: payload.id }));
  }

  function handleAddClient(
    client: Omit<Client, "id" | "archived">
  ): Client | null {
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
    notify(`Client "${canonical}" added.`);
    return record;
  }

  function handleUpdateClient(client: Client) {
    setSettings((current) => ({
      ...current,
      clients: current.clients.map((record) =>
        record.id === client.id ? client : record
      ),
    }));
    projectPort.renameClient(client.id, client.name);
    notify(
      client.archived
        ? `Client "${client.name}" archived.`
        : `Client "${client.name}" updated.`
    );
  }

  const pageContent =
    page === "project" ? (
      detailProject ? (
        <ProjectWorkspace
          project={detailProject}
          projectGroup={projectGroups.find(
            (group) => group.id === detailProject.projectGroupId
          )}
          settings={settings}
          view={activeProjectView}
          canEdit={!isSample && (canEditProjects || !detailProject.teamId)}
          canManagePayment={
            !isSample && (canManageFinance || !detailProject.teamId)
          }
          canManagePortal={
            !isSample && (canManagePortals || !detailProject.teamId)
          }
          clientHubEnabled={clientHubCapabilityEnabled}
          customPortalBrandingEnabled={customPortalBrandingCapabilityEnabled}
          canDelete={canDeleteProject(detailProject)}
          canUpdateStatus={
            !isSample &&
            (canUpdateProjectStatus || canEditProjects || !detailProject.teamId)
          }
          canComment={!isSample && canCommentProjects}
          teamMembers={activeTeamMembers}
          localActivity={localProjectActivity.filter(
            (event) => event.projectId === detailProject.id
          )}
          onBack={() => router.push(isSample ? "/sample-studio" : "/projects")}
          onViewChange={(view) => {
            setActiveProjectView(view);
            window.localStorage.setItem(
              "relay:last-project-workspace-view",
              view
            );
            router.replace(
              projectHref({
                projectId: detailProject.id,
                view,
                sample: isSample,
              })
            );
          }}
          onEdit={openEditProject}
          onDelete={(project) => requestDeleteProject(project.id)}
          onStatusChange={updateProjectStatus}
          onPaymentChange={updateProjectPayment}
        />
      ) : (
        <PageEmptyState
          icon={<FolderKanban />}
          title="Project not found"
          description="This Project does not exist or you cannot access it."
        />
      )
    ) : page === "dashboard" && personalProjects.length === 0 && !isSample ? (
      <FirstRunChecklist
        mode={isSignedIn ? "account" : "local"}
        onCreateProject={() => openNewProject("personal")}
      />
    ) : page === "dashboard" ? (
      <PrecisionDashboard
        settings={settings}
        stats={stats}
        projects={personalProjects}
        visibleProjects={filteredProjects.filter((project) => !project.teamId)}
        salaryBatches={salaryBatches}
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
        onMarkSalaryPayment={(batchId) => {
          updateSalaryBatchPayment(batchId, true);
          if (!isSample) notify("Salary payment marked as received.");
        }}
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
        currentUserId={teamData?.currentMember.userId ?? ""}
        currentUserRole={teamData?.currentMember.role}
        teamMembers={activeTeamMembers.map((member) => ({
          userId: member.userId,
          name: member.name,
        }))}
        allowAllTeamProjects={teamData?.workspace.allowAllTeamProjects ?? false}
        loading={!isAuthLoaded}
        error={
          teamSyncUnavailable
            ? "Team Projects are unavailable until cloud authentication reconnects."
            : undefined
        }
        onNewProject={openNewProject}
        onViewProject={openProjectDetails}
        onEditProject={openEditProject}
        onDeleteProject={requestDeleteProject}
        onArchiveProject={archiveProject}
        onUpdateProjectStatus={updateProjectStatus}
        canCreateProjects={canCreateProjects}
        canCreateTeamProjects={canCreateTeamProjects}
        canEditProjects={canEditProjects}
        canUpdateProjectStatus={canUpdateProjectStatus || canEditProjects}
        canDeleteProject={canDeleteProject}
        onManageProjectGroups={(scope) => {
          setProjectGroupsScope(scope);
          setProjectGroupsOpen(true);
        }}
      />
    ) : page === "clients" ? (
      <PrecisionClients
        projects={personalProjects}
        settings={settings}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onViewProject={openProjectDetails}
      />
    ) : page === "timeline" ? (
      <PrecisionTimeline
        projects={personalProjects}
        onViewProject={openProjectDetails}
      />
    ) : page === "calendar" ? (
      <PrecisionCalendar
        projects={personalProjects}
        outputs={workspaceDiscovery?.outputs ?? []}
        settings={settings}
        onViewProject={openProjectDetails}
      />
    ) : page === "files" ? (
      <PrecisionFiles
        files={workspaceDiscovery?.files ?? []}
        projectTitles={Object.fromEntries(
          projects.map((project) => [project.id, project.title])
        )}
        loading={Boolean(isSignedIn && workspaceDiscovery === undefined)}
        onOpenProject={(projectId) => {
          const project = projects.find((item) => item.id === projectId);
          if (project) openProjectDetails(project);
        }}
      />
    ) : page === "media" ? (
      <PrecisionMedia
        projects={personalProjects}
        onViewProject={openProjectDetails}
      />
    ) : page === "resources" ? (
      <ResourcesDesignPage
        resources={resourceLinks}
        projects={personalProjects}
        setResources={setResourceLinks}
        notify={notify}
      />
    ) : page === "feedback" ? (
      <PrecisionFeedback
        projects={personalProjects}
        onViewProject={openProjectDetails}
      />
    ) : page === "templates" ? (
      <TemplatesDesignPage
        onUseBlank={() => openBlankProject("personal")}
        onUseTemplate={(template) => openTemplateProject(template, "personal")}
        canManageTemplates={
          (!teamData || canManageTeamProjects) &&
          (!isAuthEnabled ||
            Boolean(
              workspaceSubscription?.capabilities.customWorkflowTemplates
            ))
        }
        customTemplatesLocked={customWorkflowTemplatesLocked}
      />
    ) : page === "reports" ? (
      <div className="grid gap-4">
        {!isAuthEnabled ||
        workspaceSubscription?.capabilities.advancedReports ? (
          <PrecisionReports
            projects={projects}
            salaryBatches={salaryBatches}
            settings={settings}
            editors={activeTeamMembers.map((member) => ({
              userId: member.userId,
              name: member.name,
            }))}
            currentUserId={teamData?.currentMember.userId}
            canManageFinance={canManageFinance}
            onUpdateBatchPayment={updateSalaryBatchPayment}
          />
        ) : (
          <ContentSection
            title="Advanced reports"
            description="Analyze project delivery and workload with the Creator plan."
          >
            <CapabilityUpgradePrompt capability="advancedReports" />
          </ContentSection>
        )}
        {!teamData || teamData.currentMember.role === "Owner" ? (
          <SalaryPlansPanel
            settings={settings}
            projects={personalProjects}
            isOwner
            capabilityEnabled={salaryPlansCapabilityEnabled}
          />
        ) : null}
      </div>
    ) : page === "integrations" ? (
      <IntegrationsDesignPage
        projects={personalProjects}
        settings={settings}
        setSettings={setSettings}
        notify={notify}
        onEditProject={openEditProject}
      />
    ) : page === "team" ? (
      <TeamDesignPage
        projects={projects}
        settings={settings}
        setSettings={setSettings}
      />
    ) : page === "team-chat" ? (
      <TeamChatPage />
    ) : page === "settings" ? (
      <SettingsDesignPage
        settings={settings}
        setSettings={setSettings}
        notify={notify}
        teamWorkspace={teamWorkspace}
        canManageWorkspace={Boolean(teamData?.currentMember.role === "Owner")}
      />
    ) : page === "account" ? (
      <AccountSettingsPage />
    ) : page === "subscription" ? (
      <SubscriptionPage />
    ) : page === "profile" ? (
      <ProfileDesignPage projects={personalProjects} settings={settings} />
    ) : page === "profile-edit" ? (
      <ProfileEditPage settings={settings} setSettings={setSettings} />
    ) : (
      <OrganizationProfilePage
        projects={teamProjects}
        settings={settings}
        stats={teamStats}
      />
    );

  const projectDialog = (
    <>
      <NewProjectDialog
        open={newProjectOpen}
        clients={clientRecords}
        projectGroups={projectGroups.filter(
          (group) =>
            group.teamId ===
            (projectStartScope === "team" ? currentTeamId : undefined)
        )}
        workflowTemplates={workflowTemplates}
        initialTemplateId={newProjectTemplateId}
        salaryPlanLabel={`${settings.salaryWorkType} Plan`}
        salaryPlans={
          isSignedIn
            ? projectStartScope === "team"
              ? []
              : salaryPlans
            : undefined
        }
        currencyCode={settings.currencyCode}
        returnFocusRef={projectLauncherTriggerRef}
        onCreateClient={(client) =>
          handleAddClient({ ...client, contactName: "", phone: "", notes: "" })
        }
        onClose={() => setNewProjectOpen(false)}
        onCreate={createProject}
      />
      <ProjectGroupsDialog
        open={projectGroupsOpen}
        teamId={projectGroupsScope === "team" ? currentTeamId : undefined}
        clients={clientRecords}
        groups={projectGroups}
        projects={
          projectGroupsScope === "team" ? teamProjects : personalProjects
        }
        currency={settings.currencyCode}
        onClose={() => setProjectGroupsOpen(false)}
        onSave={saveProjectGroup}
        onArchive={setGroupArchived}
      />
      <ProjectDialog
        open={dialogOpen}
        editing={Boolean(editingId)}
        returnFocusRef={projectLauncherTriggerRef}
        form={form}
        onFormChange={(next) => {
          setForm(next);
          if (formError) setFormError("");
        }}
        clientOptions={clientOptions}
        workTypeOptions={projectTagOptions}
        settings={settings}
        teamMembers={activeTeamMembers}
        integrationEditor={
          <IntegrationLinkManager
            title="Project Integrations"
            subtitle="Attach service links that belong only to this project."
            links={form.integrationLinks}
            emptyTitle="No project links"
            emptyBody="Add links to this project's folders, reviews, channels, or calendar events."
            onChange={(integrationLinks) =>
              setForm({ ...form, integrationLinks })
            }
          />
        }
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
  if (!isAuthLoaded) return <AppLoadingStatus />;

  if (page === "profile") {
    return (
      <div
        className="motion-enter min-h-dvh transition-colors"
        style={{ backgroundColor: canvas, color: ink }}
      >
        <SettingsContext.Provider value={settings}>
          {pageContent}
        </SettingsContext.Provider>
        {projectDialog}
        {deleteDialog}
        <WelcomeChoiceDialog
          open={authChoiceOpen && !clerkIsSignedIn && !isSignedIn}
          variant={onboardingVariant}
          onChooseLocal={chooseLocalMode}
          onCreateAccount={() => launchAccountFlow("sign-up")}
          onSignIn={() => launchAccountFlow("sign-in")}
        />
        <AnalyticsConsentDialog
          open={analyticsConsentOpen}
          onChoose={(consent) => {
            setAnalyticsConsent(consent);
            setAnalyticsConsentOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <WorkspaceShell
        page={page === "project" ? "projects" : page}
        settings={settings}
        onNewProject={() => openNewProject("personal")}
        canCreateProject={canCreateProjects}
        starterNavigation={!isSample && personalProjects.length === 0}
        showTeamNavigation={
          activeTeamMembers.length > 1 ||
          Boolean(
            teamData?.members.some((member) => member.status === "invited")
          ) ||
          settings.teamMembers.length > 0
        }
        searchRecords={workspaceSearchRecords}
        notificationSlot={<NotificationBell settings={settings} />}
      >
        {isSample ? <SampleModeBar /> : null}
        <div
          className="min-h-full transition-colors lg:h-full"
          style={{ backgroundColor: canvas, color: ink }}
        >
          <SettingsContext.Provider value={settings}>
            {pageContent}
          </SettingsContext.Provider>
        </div>
      </WorkspaceShell>
      <AppToast toast={toast} onClose={() => setToast(null)} />
      {projectDialog}
      {deleteDialog}
      <WelcomeChoiceDialog
        open={authChoiceOpen && !clerkIsSignedIn && !isSignedIn}
        variant={onboardingVariant}
        onChooseLocal={chooseLocalMode}
        onCreateAccount={() => launchAccountFlow("sign-up")}
        onSignIn={() => launchAccountFlow("sign-in")}
      />
      <AnalyticsConsentDialog
        open={analyticsConsentOpen}
        onChoose={(consent) => {
          setAnalyticsConsent(consent);
          setAnalyticsConsentOpen(false);
        }}
      />
    </>
  );
}
