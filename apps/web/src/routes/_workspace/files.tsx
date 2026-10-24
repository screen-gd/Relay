import { createFileRoute } from "@tanstack/react-router";
import { FilesApplication } from "@/features/files/files-application";

export const Route = createFileRoute("/_workspace/files")({
  component: FilesApplication,
});
