"use client";

import { useId, useState } from "react";
import {
  FillViewport,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { useTeamChatController } from "./team-controller";
import { TEAM_CHAT_MESSAGE_LIMIT } from "./team-constants";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { Card as OwnedCard } from "@/components/ui/card";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import { LoaderCircle, MessageSquare, Send, Users } from "lucide-react";

export function TeamChatPage() {
  const {
    isSignedIn,
    isUserLoaded,
    openSignIn,
    isConvexAuthenticated,
    isConvexAuthLoading,
    teamData,
    sendChatMessage,
  } = useTeamChatController();
  const messageInputId = useId();
  const messageCountId = `${messageInputId}-count`;
  const chatInputProps = { maxLength: TEAM_CHAT_MESSAGE_LIMIT };
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const canUseChat = Boolean(teamData?.currentMember.permissions.useChat);
  const chatReady = Boolean(
    isUserLoaded &&
    isSignedIn &&
    !isConvexAuthLoading &&
    isConvexAuthenticated &&
    teamData &&
    canUseChat
  );

  function formatChatTime(value: string) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
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
      setChatError(
        error instanceof Error ? error.message : "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <WorkspacePage family="conversation" mode="fill">
      <PageHeader
        title="Team Chat"
        description="Quick handoffs, production updates, and Manage Team access for your current workspace."
      />
      <PageContent mode="fill" className="min-h-0">
        <FillViewport
          bodyLabel="Team chat workspace"
          bodyClassName="overflow-auto rounded-[6px] border border-border bg-card lg:overflow-hidden"
          header={
            chatReady && teamData ? (
              <div
                data-slot="conversation-header"
                className="flex flex-col justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-4 sm:flex-row sm:items-center sm:px-5"
              >
                <div>
                  <h2 className="text-lg font-semibold">
                    {teamData.workspace.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                    {
                      teamData.members.filter(
                        (member) => member.status === "active"
                      ).length
                    }{" "}
                    active members · Use @name to notify someone
                  </p>
                </div>
                <OwnedBadge
                  variant="secondary"
                  className="self-start sm:self-auto"
                >
                  {teamData.currentMember.role === "Reviewer"
                    ? "Viewer"
                    : teamData.currentMember.role}{" "}
                  access
                </OwnedBadge>
              </div>
            ) : undefined
          }
          footer={
            chatReady && teamData ? (
              <form
                data-slot="conversation-composer"
                className="team-chat-composer border-t border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3 sm:p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMessage();
                }}
              >
                {chatError ? (
                  <p
                    role="alert"
                    className="mb-2 text-xs font-semibold text-destructive"
                  >
                    {chatError}
                  </p>
                ) : null}
                <div className="grid gap-2">
                  <label
                    htmlFor={messageInputId}
                    className="text-sm font-medium"
                  >
                    Message
                  </label>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
                    <OwnedTextarea
                      id={messageInputId}
                      aria-describedby={messageCountId}
                      aria-invalid={Boolean(chatError)}
                      value={message}
                      rows={2}
                      {...chatInputProps}
                      className="max-h-28 min-h-10 flex-1 bg-background"
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
                    <OwnedButton
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="min-w-28"
                    >
                      {sending ? (
                        <LoaderCircle aria-hidden="true" />
                      ) : (
                        <Send aria-hidden="true" />
                      )}
                      {sending ? "Sending..." : "Send"}
                    </OwnedButton>
                  </div>
                  <p
                    id={messageCountId}
                    className="text-xs text-[var(--app-muted)]"
                  >
                    {message.length}/{TEAM_CHAT_MESSAGE_LIMIT} characters
                  </p>
                </div>
              </form>
            ) : undefined
          }
        >
          {!isUserLoaded ? (
            <OwnedCard className="p-6 shadow-[var(--app-shadow-1)]">
              <div
                role="status"
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Checking account status...
              </div>
            </OwnedCard>
          ) : !isSignedIn ? (
            <OwnedCard className="p-6 shadow-[var(--app-shadow-1)]">
              <h2 className="text-xl font-semibold">
                Sign in to open Team Chat
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Chat is tied to your authenticated team workspace and is not
                available in local mode.
              </p>
              <OwnedButton
                type="button"
                className="mt-5"
                onClick={() => openSignIn()}
              >
                Sign In
              </OwnedButton>
            </OwnedCard>
          ) : isConvexAuthLoading ? (
            <OwnedCard className="p-6 shadow-[var(--app-shadow-1)]">
              <div
                role="status"
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Connecting Team Chat...
              </div>
            </OwnedCard>
          ) : !isConvexAuthenticated ? (
            <OwnedCard
              role="alert"
              className="border-destructive/40 bg-destructive/10 p-6 text-destructive shadow-sm"
            >
              <h2 className="text-lg font-semibold">
                Team Chat is not connected
              </h2>
              <p className="mt-2 text-sm">
                Convex has not received your Clerk session. Sign out and back
                in, then retry.
              </p>
            </OwnedCard>
          ) : teamData === undefined ? (
            <OwnedCard className="p-6 shadow-[var(--app-shadow-1)]">
              <div
                role="status"
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Loading messages...
              </div>
            </OwnedCard>
          ) : !teamData ? (
            <OwnedCard className="grid min-h-72 place-items-center p-6 text-center shadow-[var(--app-shadow-1)]">
              <div className="max-w-md">
                <Users
                  className="mx-auto size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-semibold">
                  No team workspace yet
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create or join a workspace before using Team Chat.
                </p>
              </div>
            </OwnedCard>
          ) : !canUseChat ? (
            <OwnedCard className="p-6 shadow-[var(--app-shadow-1)]">
              <h2 className="text-xl font-semibold">
                Chat unavailable for your role
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your current role can access the workspace but does not have
                permission to view or send chat messages.
              </p>
            </OwnedCard>
          ) : (
            <div
              data-slot="conversation-history"
              className="min-h-full bg-[var(--app-panel)]"
            >
              <ol
                aria-label="Team chat messages"
                className="flex min-h-full flex-col gap-3 px-3 py-5 md:px-5"
              >
                {teamData.chat.length ? (
                  teamData.chat.map((chatMessage) => {
                    const isOwnMessage =
                      chatMessage.authorUserId ===
                      teamData.currentMember.userId;
                    return (
                      <li
                        key={chatMessage._id}
                        className={`w-[min(680px,88%)] ${isOwnMessage ? "self-end" : "self-start"}`}
                      >
                        <div
                          className={`mb-1 flex items-center gap-2 ${isOwnMessage ? "justify-end" : "justify-between"}`}
                        >
                          {!isOwnMessage ? (
                            <span className="text-xs font-semibold">
                              {chatMessage.authorName}
                            </span>
                          ) : null}
                          <time className="text-[11px] text-muted-foreground">
                            {formatChatTime(chatMessage.createdAt)}
                          </time>
                        </div>
                        <div
                          className={`rounded-lg border px-3 py-2.5 ${isOwnMessage ? "border-primary bg-primary/10" : "border-border bg-muted"}`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
                            {chatMessage.body}
                          </p>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="m-auto max-w-md list-none text-center">
                    <MessageSquare
                      className="mx-auto size-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 font-semibold">No messages yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Start with a handoff, blocker, review update, or delivery
                      note.
                    </p>
                  </li>
                )}
              </ol>
            </div>
          )}
        </FillViewport>
      </PageContent>
    </WorkspacePage>
  );
}
