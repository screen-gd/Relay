"use client";

import { useEffect, useState, type RefObject } from "react";
import { useForm } from "@tanstack/react-form";
import type {
  Client,
  ProjectGroup,
  SalaryPlan,
  SavedProjectTemplate,
} from "@/lib/types";
import {
  newProjectFormSchema,
  type NewProjectFormValues,
  type NewProjectInput,
} from "@/features/projects/project-domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown } from "lucide-react";

type NewProjectDialogProps = {
  open: boolean;
  clients: readonly Client[];
  projectGroups: readonly ProjectGroup[];
  workflowTemplates: readonly SavedProjectTemplate[];
  initialTemplateId?: string;
  salaryPlanLabel: string;
  salaryPlans?: readonly SalaryPlan[];
  currencyCode?: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  onCreateClient: (
    input: Pick<Client, "name" | "email" | "company">
  ) => Client | null;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
};

const defaultDueDate = () =>
  new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

const defaultValues = (initialTemplateId: string): NewProjectFormValues => ({
  name: "",
  clientId: "",
  projectGroupId: "",
  workflowTemplateId: initialTemplateId,
  dueDate: defaultDueDate(),
  financialType: "client",
  salaryPlanId: "",
});

type ContextMenuOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ContextMenuSelectProps = {
  value: string;
  placeholder: string;
  options: readonly ContextMenuOption[];
  onChange: (value: string) => void;
  contentClassName?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: boolean | "grammar" | "spelling";
  "aria-required"?: boolean | "false" | "true";
  "aria-label"?: string;
};

function ContextMenuSelect({
  value,
  placeholder,
  options,
  onChange,
  contentClassName,
  ...buttonProps
}: ContextMenuSelectProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          {...buttonProps}
          className="w-full justify-between rounded-md border-input bg-input/30 text-left font-normal"
        >
          <span
            className={
              selectedOption ? "truncate" : "truncate text-muted-foreground"
            }
          >
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown
            className="size-4 shrink-0 opacity-50"
            strokeWidth={1.75}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`min-w-[15rem] max-w-[calc(100vw-2rem)] ${contentClassName ?? ""}`}
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            disabled={option.disabled}
            onSelect={() => onChange(option.value)}
            className="justify-between gap-4"
          >
            <span className="truncate">{option.label}</span>
            <Check
              className={`size-4 shrink-0 ${option.value === value ? "opacity-100" : "opacity-0"}`}
              strokeWidth={1.75}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NewProjectDialog({
  open,
  clients,
  projectGroups,
  workflowTemplates,
  initialTemplateId = "",
  salaryPlanLabel,
  salaryPlans,
  currencyCode = "USD",
  returnFocusRef,
  onCreateClient,
  onClose,
  onCreate,
}: NewProjectDialogProps) {
  const activeClients = clients.filter((client) => !client.archived);
  const activeTemplates = workflowTemplates.filter(
    (template) => !template.archived
  );
  const activeSalaryPlans = salaryPlans?.filter((plan) => !plan.archived) ?? [];
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientDraft, setClientDraft] = useState({
    name: "",
    email: "",
    company: "",
  });
  const [clientError, setClientError] = useState("");
  const form = useForm({
    defaultValues: defaultValues(initialTemplateId),
    validators: { onSubmit: newProjectFormSchema },
    onSubmit: ({ value }) =>
      onCreate({
        name: value.name.trim(),
        clientId: value.clientId,
        ...(value.projectGroupId
          ? { projectGroupId: value.projectGroupId }
          : {}),
        ...(value.workflowTemplateId
          ? { workflowTemplateId: value.workflowTemplateId }
          : {}),
        dueDate: value.dueDate,
        financialType: value.financialType,
        ...(value.salaryPlanId ? { salaryPlanId: value.salaryPlanId } : {}),
      }),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues(initialTemplateId));
    setCreatingClient(false);
    setClientDraft({ name: "", email: "", company: "" });
    setClientError("");
  }, [form, initialTemplateId, open]);

  function createClient() {
    if (!clientDraft.name.trim()) {
      setClientError("Client name is required.");
      return;
    }
    const client = onCreateClient(clientDraft);
    if (!client) {
      setClientError("That Client could not be created.");
      return;
    }
    form.setFieldValue("clientId", client.id);
    form.setFieldValue("projectGroupId", "");
    setCreatingClient(false);
    setClientError("");
  }

  function requestClose() {
    const hasClientDraft = Object.values(clientDraft).some((value) =>
      value.trim()
    );
    if (
      (form.state.isDirty || hasClientDraft) &&
      typeof window !== "undefined" &&
      !window.confirm("Discard this unfinished Project?")
    )
      return;
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <DialogContent
        className="studio-motion-gooey border-border bg-background text-foreground sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef.current;
          if (!target?.isConnected) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Start with the choices needed to schedule the work.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <FieldLayout label="Project name">
                <Input
                  autoFocus
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </FieldLayout>
            )}
          </form.Field>
          <form.Field name="clientId">
            {(field) => (
              <FieldLayout label="Client">
                <div>
                  <form.Subscribe
                    selector={(state) => state.values.salaryPlanId}
                  >
                    {(salaryPlanId) => {
                      const selectedPlan = activeSalaryPlans.find(
                        (plan) => plan.id === salaryPlanId
                      );
                      return (
                        <>
                          <ContextMenuSelect
                            aria-label="Client"
                            disabled={Boolean(selectedPlan)}
                            value={field.state.value}
                            placeholder="Choose a Client"
                            options={activeClients.map((client) => ({
                              value: client.id,
                              label: client.name,
                            }))}
                            onChange={(value) => {
                              field.handleChange(value);
                              form.setFieldValue("projectGroupId", "");
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1 px-0"
                            disabled={Boolean(selectedPlan)}
                            onClick={() =>
                              setCreatingClient((current) => !current)
                            }
                          >
                            Create new Client
                          </Button>
                        </>
                      );
                    }}
                  </form.Subscribe>
                  {creatingClient ? (
                    <div className="mt-2 grid gap-2 border-l border-border pl-3">
                      <Input
                        aria-label="New Client name"
                        placeholder="Client name"
                        value={clientDraft.name}
                        onChange={(event) =>
                          setClientDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          aria-label="New Client email"
                          type="email"
                          placeholder="Email (optional)"
                          value={clientDraft.email}
                          onChange={(event) =>
                            setClientDraft((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                        />
                        <Input
                          aria-label="New Client company"
                          placeholder="Company (optional)"
                          value={clientDraft.company}
                          onChange={(event) =>
                            setClientDraft((current) => ({
                              ...current,
                              company: event.target.value,
                            }))
                          }
                        />
                      </div>
                      {clientError ? (
                        <p role="alert" className="text-sm text-destructive">
                          {clientError}
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={createClient}>
                          Add Client
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setCreatingClient(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </FieldLayout>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values.clientId}>
            {(clientId) => (
              <form.Field name="projectGroupId">
                {(field) => (
                  <FieldLayout label="Project Group" description="Optional">
                    <ContextMenuSelect
                      value={field.state.value || "none"}
                      placeholder="No Project Group"
                      options={[
                        { value: "none", label: "No Project Group" },
                        ...projectGroups
                          .filter(
                            (group) =>
                              !group.archived && group.clientId === clientId
                          )
                          .map((group) => ({
                            value: group.id,
                            label: group.name,
                          })),
                      ]}
                      onChange={(value) =>
                        field.handleChange(value === "none" ? "" : value)
                      }
                    />
                  </FieldLayout>
                )}
              </form.Field>
            )}
          </form.Subscribe>
          <form.Field name="workflowTemplateId">
            {(field) => (
              <FieldLayout label="Workflow Template">
                <ContextMenuSelect
                  value={field.state.value || "none"}
                  placeholder="No Template"
                  options={[
                    { value: "none", label: "No Template" },
                    ...activeTemplates.map((template) => ({
                      value: template.id,
                      label: template.name,
                    })),
                  ]}
                  onChange={(value) =>
                    field.handleChange(value === "none" ? "" : value)
                  }
                />
              </FieldLayout>
            )}
          </form.Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="dueDate">
              {(field) => (
                <FieldLayout label="Due date">
                  <Input
                    type="date"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </FieldLayout>
              )}
            </form.Field>
            <form.Field name="financialType">
              {(field) => (
                <FieldLayout label="Financial type">
                  <ContextMenuSelect
                    placeholder="Client Project"
                    value={field.state.value}
                    options={[
                      { value: "client", label: "Client Project" },
                      {
                        value: "salary-plan",
                        label: salaryPlanLabel,
                        disabled:
                          salaryPlans !== undefined &&
                          activeSalaryPlans.length === 0,
                      },
                    ]}
                    onChange={(value) => {
                      if (value === "client" || value === "salary-plan") {
                        field.handleChange(value);
                        if (value === "client")
                          form.setFieldValue("salaryPlanId", "");
                      }
                    }}
                  />
                </FieldLayout>
              )}
            </form.Field>
          </div>
          <form.Subscribe selector={(state) => state.values.financialType}>
            {(financialType) =>
              financialType === "salary-plan" && salaryPlans !== undefined ? (
                <form.Field name="salaryPlanId">
                  {(field) => (
                    <FieldLayout
                      label="Salary Plan"
                      description="The Plan fixes the Client and keeps Project earnings at zero."
                    >
                      <ContextMenuSelect
                        value={field.state.value || "none"}
                        placeholder="Choose a Salary Plan"
                        contentClassName="min-w-[22rem]"
                        options={[
                          { value: "none", label: "Choose a Salary Plan" },
                          ...activeSalaryPlans.map((plan) => {
                            const client = activeClients.find(
                              (candidate) => candidate.id === plan.clientId
                            );
                            const amount = new Intl.NumberFormat("en", {
                              style: "currency",
                              currency: currencyCode,
                              maximumFractionDigits: 0,
                            }).format(plan.amount);
                            return {
                              value: plan.id,
                              label: `${client?.name ?? "Unknown Client"} · ${plan.requiredProjectCount} Projects · ${amount}`,
                            };
                          }),
                        ]}
                        onChange={(value) => {
                          const plan = activeSalaryPlans.find(
                            (candidate) => candidate.id === value
                          );
                          field.handleChange(value === "none" ? "" : value);
                          if (plan) {
                            form.setFieldValue("clientId", plan.clientId);
                            form.setFieldValue("projectGroupId", "");
                          }
                        }}
                      />
                    </FieldLayout>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={requestClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
