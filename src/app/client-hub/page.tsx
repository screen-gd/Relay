"use client";

import { UserButton } from "@clerk/nextjs";
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

export default function ClientHubPage() {
  const { isLoaded, isSignedIn } = useOptionalAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const hub = useQuery(
    api.clientHub.getMine,
    isSignedIn && isAuthenticated ? {} : "skip"
  );
  const authLoading = !isLoaded || (isSignedIn && isLoading);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/15 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-lg font-semibold">Relay Client Hub</span>
          {isSignedIn ? <UserButton /> : null}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <p className="text-xs font-semibold tracking-[0.16em] text-amber-400 uppercase">
          Published work
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {hub
            ? `Good to see you, ${hub.contactName}`
            : authLoading
              ? "Loading your projects"
              : isSignedIn
                ? "Connecting your Client Hub"
                : "Sign in to view your projects"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Only projects your Workspace has published to you appear here.
        </p>

        <div className="mt-10 border-t border-white/20">
          <Table
            aria-label="Published projects"
            className="w-full min-w-[680px] border-collapse text-left"
          >
            <TableHeader className="text-xs tracking-wider text-zinc-500 uppercase">
              <TableRow className="border-b border-white/15">
                <TableHead className="h-auto px-2 py-3 font-medium text-zinc-500">
                  Project
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-zinc-500">
                  Stage
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-zinc-500">
                  Progress
                </TableHead>
                <TableHead className="h-auto px-2 py-3 font-medium text-zinc-500">
                  Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-b">
              {hub?.projects.map((project) => (
                <TableRow key={project.id} className="border-b border-white/10">
                  <TableCell className="px-2 py-5 font-medium">
                    {project.title}
                  </TableCell>
                  <TableCell className="px-2 py-5 text-zinc-300">
                    {project.status}
                  </TableCell>
                  <TableCell className="px-2 py-5 text-zinc-300">
                    {project.progress}%
                  </TableCell>
                  <TableCell className="px-2 py-5 text-zinc-400">
                    {formatDate(project.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hub && hub.projects.length === 0 ? (
            <p className="py-10 text-sm text-zinc-400">
              No projects have been published to you yet.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
