import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOptionalAuth } from "@/lib/optional-auth";
import { UserButton } from "@clerk/tanstack-react-start";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function ClientHubPage() {
  const { isLoaded, isSignedIn } = useOptionalAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const hub = useQuery(
    api.clientHub.getMine,
    isSignedIn && isAuthenticated ? {} : "skip"
  );
  const authLoading = !isLoaded || (isSignedIn && isLoading);

  return (
    <main className="min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)]">
      <header className="px-6 py-4 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-title font-semibold">Relay Client Hub</span>
          {isSignedIn ? <UserButton /> : null}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <h1 className="mt-2 text-display font-semibold">
          {hub
            ? `Good to see you, ${hub.contactName}`
            : authLoading
              ? "Loading your projects"
              : isSignedIn
                ? "Connecting your Client Hub"
                : "Sign in to view your projects"}
        </h1>
        <p className="mt-2 text-body text-[var(--text-meta)]">
          Only projects your Workspace has published to you appear here.
        </p>

        <div className="mt-10">
          <Table
            aria-label="Published projects"
            className="w-full min-w-[680px] text-left"
          >
            <TableHeader className="text-meta text-[var(--text-meta)]">
              <TableRow className="">
                <TableHead className="h-auto px-2 py-3 font-medium text-[var(--text-meta)]">
                  Project
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-[var(--text-meta)]">
                  Stage
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-[var(--text-meta)]">
                  Progress
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-[var(--text-meta)]">
                  Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="">
              {hub?.projects.map((project) => (
                <TableRow key={project.id} className="">
                  <TableCell className="px-2 py-4 font-medium">
                    {project.title}
                  </TableCell>
                  <TableCell className="px-2 py-4 text-[var(--text-primary)]">
                    {project.status}
                  </TableCell>
                  <TableCell className="px-2 py-4 text-[var(--text-meta)]">
                    {project.progress}%
                  </TableCell>
                  <TableCell className="px-2 py-4 text-[var(--text-meta)]">
                    {formatDate(project.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hub && hub.projects.length === 0 ? (
            <p className="py-10 text-body text-[var(--text-meta)]">
              No projects have been published to you yet.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
