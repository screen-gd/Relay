"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CircleDollarSign,
  Globe2,
  Link2,
  Palette,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Workflow,
} from "lucide-react";
import type { SettingsState } from "@/lib/types";
import {
  configuredIntegrationCount,
  integrationServices,
  isValidIntegrationUrl,
  normalizeUrl,
  type IntegrationServiceId,
} from "@/lib/integrations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type SettingsSection = "workspace" | "workflow" | "permissions" | "integrations" | "notifications" | "appearance" | "regional";

const sections = [
  { value: "workspace", label: "Workspace", icon: SlidersHorizontal },
  { value: "workflow", label: "Workflow", icon: Workflow },
  { value: "permissions", label: "Permissions", icon: ShieldCheck },
  { value: "integrations", label: "Integrations", icon: Link2 },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "regional", label: "Regional", icon: Globe2 },
] as const;

const currencies = ["USD", "EUR", "GBP", "INR", "AED", "SAR"];
const accents = ["#1f8a83", "#2e9eb3", "#245f66", "#5bb7be", "#667085", "#8a94a6"];

export function PrecisionSettings({
  settings,
  setSettings,
  onReset,
  notify,
}: {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  onReset: () => void;
  notify: (message: string, tone?: "success" | "warning" | "info") => void;
}) {
  const [section, setSection] = useState<SettingsSection>("workspace");
  const update = (patch: Partial<SettingsState>) => setSettings((current) => ({ ...current, ...patch }));

  return (
    <div className="mx-auto min-h-[calc(100dvh-56px)] w-full max-w-[1580px] px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
      <header className="flex min-h-[72px] flex-col gap-3 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.015em]">Settings</h1>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Manage workspace defaults, notifications, and display preferences.</p>
        </div>
        <div className="flex h-8 items-center gap-1.5 text-xs text-[var(--app-success)]" role="status">
          <Check className="size-4" />
          Saved automatically
        </div>
      </header>

      <Tabs value={section} onValueChange={(value) => setSection(value as SettingsSection)} orientation="vertical" className="mt-4 gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-[72px] lg:self-start">
          <TabsList variant="line" className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-2 sm:grid-cols-4 lg:flex lg:flex-col lg:items-stretch">
            {sections.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="h-9 justify-start rounded-md px-3 text-xs after:hidden data-[state=active]:bg-[var(--app-active)] data-[state=active]:text-[var(--app-highlight)]">
                <Icon className="size-4" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Separator className="my-3 hidden lg:block" />
          <ResetPreferencesButton className="hidden w-full justify-start lg:flex" onReset={onReset} />
        </aside>

        <div className="min-w-0">
          <TabsContent value="workspace"><WorkspacePanel settings={settings} update={update} /></TabsContent>
          <TabsContent value="workflow"><WorkflowPanel settings={settings} update={update} /></TabsContent>
          <TabsContent value="permissions"><PermissionsPanel /></TabsContent>
          <TabsContent value="integrations"><IntegrationsPanel settings={settings} update={update} notify={notify} /></TabsContent>
          <TabsContent value="notifications"><NotificationsPanel settings={settings} update={update} /></TabsContent>
          <TabsContent value="appearance"><AppearancePanel settings={settings} update={update} /></TabsContent>
          <TabsContent value="regional"><RegionalPanel settings={settings} update={update} /></TabsContent>
          <ResetPreferencesButton className="mt-4 w-full lg:hidden" variant="outline" onReset={onReset} />
        </div>
      </Tabs>
    </div>
  );
}

function ResetPreferencesButton({
  className,
  onReset,
  variant = "ghost",
}: {
  className?: string;
  onReset: () => void;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} className={cn(className, "text-[var(--app-danger)] hover:text-[var(--app-danger)]")}>
          <RotateCcw /> Reset preferences
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset all preferences?</AlertDialogTitle>
          <AlertDialogDescription>
            This restores workspace defaults, workflow settings, integrations, notifications, and appearance. Your projects and files will not be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onReset}>Reset preferences</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 border-[var(--app-border)] bg-[var(--app-panel)] py-0 shadow-none">
      <CardHeader className="border-b border-[var(--app-border)] px-4 py-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs text-[var(--app-muted)]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function WorkspacePanel({ settings, update }: PanelProps) {
  const changeTag = (index: number, value: string) => {
    const previous = settings.projectTags[index];
    update({
      projectTags: settings.projectTags.map((tag, i) => i === index ? value : tag),
      salaryWorkType: previous === settings.salaryWorkType ? value : settings.salaryWorkType,
    });
  };
  const removeTag = (index: number) => {
    const removed = settings.projectTags[index];
    const projectTags = settings.projectTags.filter((_, i) => i !== index);
    update({
      projectTags,
      salaryWorkType: removed === settings.salaryWorkType ? (projectTags.find(Boolean) ?? "") : settings.salaryWorkType,
    });
  };
  return (
    <SettingsCard title="Workspace defaults" description="Set the production tags and salary batch rules used for new projects.">
      <div className="space-y-4">
        <Field label="Studio name"><Input value={settings.studioName} onChange={(event) => update({ studioName: event.target.value })} /></Field>
        <div className="space-y-2">
          <Label className="text-xs">Project Tags</Label>
          {settings.projectTags.map((tag, index) => (
            <div key={index} className="flex gap-2">
              <Input value={tag} aria-label={`Project tag ${index + 1}`} onChange={(event) => changeTag(index, event.target.value)} />
              <Button variant="ghost" size="icon" aria-label={`Remove project tag ${index + 1}`} disabled={settings.projectTags.length === 1} onClick={() => removeTag(index)}><Trash2 /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => update({ projectTags: [...settings.projectTags, `Tag ${settings.projectTags.length + 1}`] })}><Plus /> Add tag</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Salary tag">
            <Select value={settings.salaryWorkType} onValueChange={(value) => update({ salaryWorkType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{settings.projectTags.filter(Boolean).map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label="Videos per batch"><Input type="number" min={1} value={settings.salaryBatchSize} onChange={(event) => update({ salaryBatchSize: Math.max(1, Number(event.target.value) || 1) })} /></Field>
          <Field label="Salary per batch"><Input type="number" min={0} value={settings.salaryBatchAmount} onChange={(event) => update({ salaryBatchAmount: Math.max(0, Number(event.target.value) || 0) })} /></Field>
        </div>
      </div>
    </SettingsCard>
  );
}

function WorkflowPanel({ settings, update }: PanelProps) {
  return (
    <SettingsCard title="Project workflow" description="Keep the stage order used when a new production starts.">
      <div className="space-y-2">
        {settings.projectStages.map((stage, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="outline" className="w-8 justify-center rounded-md">{index + 1}</Badge>
            <Input value={stage} aria-label={`Workflow stage ${index + 1}`} onChange={(event) => update({ projectStages: settings.projectStages.map((item, i) => i === index ? event.target.value : item) })} />
            <Button variant="ghost" size="icon" aria-label={`Remove workflow stage ${index + 1}`} disabled={settings.projectStages.length === 1} onClick={() => update({ projectStages: settings.projectStages.filter((_, i) => i !== index) })}><Trash2 /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => update({ projectStages: [...settings.projectStages, `Stage ${settings.projectStages.length + 1}`] })}><Plus /> Add stage</Button>
      </div>
    </SettingsCard>
  );
}

function PermissionsPanel() {
  const roles = [
    ["Owner", "Full workspace, billing, team, and project control."],
    ["Editor", "Create and edit projects, stages, notes, and assignments."],
    ["Reviewer", "View team projects and leave review notes."],
  ];
  return <SettingsCard title="Roles and permissions" description="Convex enforces these workspace roles on shared actions."><div className="grid gap-3 md:grid-cols-3">{roles.map(([role, copy]) => <Card key={role} className="gap-2 border-[var(--app-border)] bg-[var(--app-soft-panel)] p-4 shadow-none"><CardTitle className="text-sm">{role}</CardTitle><CardDescription className="text-xs leading-5">{copy}</CardDescription></Card>)}</div></SettingsCard>;
}

function IntegrationsPanel({ settings, update, notify }: PanelProps & { notify: (message: string, tone?: "success" | "warning" | "info") => void }) {
  return (
    <SettingsCard title="Integration links" description="Save direct links to folders, calendars, review pages, and team channels.">
      <div className="mb-3 flex justify-end"><Badge variant="outline">{configuredIntegrationCount(settings.integrationLinks)} configured</Badge></div>
      <div className="divide-y divide-[var(--app-border)] rounded-lg border border-[var(--app-border)]">
        {integrationServices.map((service) => (
          <IntegrationLinkRow
            key={service.id}
            service={service}
            settings={settings}
            update={update}
            notify={notify}
          />
        ))}
      </div>
    </SettingsCard>
  );
}

function IntegrationLinkRow({
  service,
  settings,
  update,
  notify,
}: PanelProps & {
  service: (typeof integrationServices)[number];
  notify: (message: string, tone?: "success" | "warning" | "info") => void;
}) {
  const link = settings.integrationLinks[service.id];
  const [draft, setDraft] = useState(link?.url ?? "");

  useEffect(() => setDraft(link?.url ?? ""), [link?.url]);

  const save = () => {
    const url = normalizeUrl(draft);
    if (url && !isValidIntegrationUrl(url)) {
      notify(`Enter a valid http or https URL for ${service.name}.`, "warning");
      return;
    }

    const integrationLinks = { ...settings.integrationLinks };
    if (!url) {
      delete integrationLinks[service.id as IntegrationServiceId];
      update({ integrationLinks });
      notify(`${service.name} link removed.`, "info");
      return;
    }

    integrationLinks[service.id] = {
      url,
      label: link?.label ?? "",
      notes: link?.notes ?? "",
      updatedAt: new Date().toISOString(),
    };
    update({ integrationLinks });
    setDraft(url);
    notify(`${service.name} link saved.`);
  };

  return (
    <div className="grid gap-3 p-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center">
      <div>
        <p className="text-xs font-semibold">{service.name}</p>
        <p className="mt-0.5 text-[10px] text-[var(--app-muted)]">{service.description}</p>
      </div>
      <Input
        type="url"
        placeholder="https://"
        value={draft}
        aria-label={`${service.name} link`}
        aria-invalid={Boolean(draft.trim()) && !isValidIntegrationUrl(draft)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
        }}
      />
      <Button variant="outline" size="sm" onClick={save}>{draft.trim() ? "Save" : "Remove"}</Button>
    </div>
  );
}

function NotificationsPanel({ settings, update }: PanelProps) {
  return <SettingsCard title="Notifications" description="Choose which project and team events appear in your notification center."><div className="divide-y divide-[var(--app-border)]">{Object.entries(settings.notifications).map(([name, enabled]) => <div key={name} className="flex min-h-14 items-center justify-between gap-4"><Label htmlFor={`notification-${name}`} className="text-xs">{name}</Label><Switch id={`notification-${name}`} checked={enabled} onCheckedChange={(checked) => update({ notifications: { ...settings.notifications, [name]: checked } })} /></div>)}</div></SettingsCard>;
}

function AppearancePanel({ settings, update }: PanelProps) {
  return <SettingsCard title="Appearance" description="Use the same theme and density across every workspace page."><div className="grid gap-5 md:grid-cols-2"><Field label="Theme"><Select value={settings.theme} onValueChange={(theme) => update({ theme })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Light", "Dark", "System"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Density"><Select value={settings.density} onValueChange={(density) => update({ density })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Comfortable", "Compact"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><div className="md:col-span-2"><Label className="text-xs">Accent color</Label><div className="mt-2 flex flex-wrap gap-2">{accents.map((color) => <Button key={color} variant="outline" size="icon" aria-label={`Use accent color ${color}`} className={cn("rounded-full p-1", settings.accentColor === color && "ring-2 ring-[var(--app-ink)]")} onClick={() => update({ accentColor: color })}><span className="size-6 rounded-full" style={{ backgroundColor: color }} /></Button>)}</div></div></div></SettingsCard>;
}

function RegionalPanel({ settings, update }: PanelProps) {
  const amount = new Intl.NumberFormat("en", { style: "currency", currency: settings.currencyCode, maximumFractionDigits: 0 }).format(12500);
  return <SettingsCard title="Regional preferences" description="Set date, week, time zone, and currency defaults."><div className="grid gap-4 md:grid-cols-2"><Field label="Currency"><Select value={settings.currencyCode} onValueChange={(currencyCode) => update({ currencyCode })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{currencies.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Preview"><div className="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-control)] px-3 text-sm"><CircleDollarSign className="mr-2 size-4 text-[var(--app-muted)]" />{amount}</div></Field><Field label="Time zone"><Select value={settings.timeZone} onValueChange={(timeZone) => update({ timeZone })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Asia/Dubai", "Pacific Time", "Eastern Time", "UTC"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Date format"><Select value={settings.dateFormat} onValueChange={(dateFormat) => update({ dateFormat })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Month Day, Year", "Day Month Year", "YYYY-MM-DD"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Week starts on"><Select value={settings.weekStart} onValueChange={(weekStart) => update({ weekStart })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field></div></SettingsCard>;
}

type PanelProps = { settings: SettingsState; update: (patch: Partial<SettingsState>) => void };
