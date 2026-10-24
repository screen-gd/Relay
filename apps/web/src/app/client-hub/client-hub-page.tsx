import { UserButton } from "@clerk/tanstack-react-start";
import { useOptionalAuth } from "@/lib/optional-auth";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <main className="min-h-screen bg-page text-text-1">
      <header className="px-6 py-4 shadow-[inset_0_-1px_0_var(--line-row)] md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="type-heading-sm">Relay Client Hub</span>
          {isSignedIn ? <UserButton /> : null}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <h1 className="type-heading-lg">
          {hub
            ? `Good to see you, ${hub.contactName}`
            : authLoading
              ? "Loading your projects"
              : isSignedIn
                ? "Connecting your Client Hub"
                : "Sign in to view your projects"}
        </h1>
        <p className="mt-2 text-text-2 type-body">
          Only projects your Workspace has published to you appear here.
        </p>

        <div className="mt-8 overflow-hidden rounded-frame shadow-[0_0_0_1px_var(--line-row)]">
          <Table
            aria-label="Published projects"
            className="w-full min-w-[680px] border-collapse text-left"
          >
            <TableHeader className="text-text-3 type-label-sm">
              <TableRow className="">
                <TableHead className="h-auto px-2 py-3 font-medium text-text-3">
                  Project
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-text-3">
                  Stage
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-text-3">
                  Progress
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-text-3">
                  Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-b">
              {hub?.projects.map((project) => (
                <TableRow key={project.id} className="border-b ">
                  <TableCell className="px-2 py-5 font-medium">
                    {project.title}
                  </TableCell>
                  <TableCell className="px-2 py-5 text-text-1">
                    {project.status}
                  </TableCell>
                  <TableCell className="px-2 py-5 text-text-1">
                    {project.progress}%
                  </TableCell>
                  <TableCell className="px-2 py-5 text-text-2">
                    {formatDate(project.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hub && hub.projects.length === 0 ? (
            <p className="py-10 text-text-2 type-body">
              No projects have been published to you yet.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
