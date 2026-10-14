import { createFileRoute } from "@tanstack/react-router";
import { TeamChatPage } from "@/features/team/team-chat-page";

export const Route = createFileRoute("/_workspace/team-chat")({
  component: TeamChatPage,
});
