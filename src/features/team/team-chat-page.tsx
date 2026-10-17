"use client";

import { MessageSquare, Send, Users } from "@/components/icons";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { Label as OwnedLabel } from "@/components/ui/label";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  FillViewport,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { useId, useState } from "react";
import { TEAM_CHAT_MESSAGE_LIMIT } from "./team-constants";
import { useTeamChatController } from "./team-controller";

export function TeamChatPage() {
  const {
    isSignedIn,
    isUserLoaded,
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
        description="Chat with your team about projects and updates."
      />
      <PageContent mode="fill" className="min-h-0">
        <FillViewport
          bodyLabel="Team chat workspace"
          bodyClassName="overflow-auto lg:overflow-hidden"
          header={
            chatReady && teamData ? (
              <div
                data-slot="conversation-header"
                className="flex flex-col justify-between gap-3 bg-[var(--surface-page)] pb-3 sm:flex-row sm:items-center"
              >
                <div>
                  <h2 className="text-body font-medium text-[var(--text-primary)]">
                    {teamData.workspace.name}
                  </h2>
                  <p className="mt-1 text-meta text-[var(--text-meta)]">
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
                className="team-chat-composer border-t border-[var(--border-hairline)] pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMessage();
                }}
              >
                {chatError ? (
                  <p
                    role="alert"
                    className="mb-2 text-meta text-[var(--status-danger)]"
                  >
                    {chatError}
                  </p>
                ) : null}
                <div className="grid gap-2">
                  <OwnedLabel htmlFor={messageInputId} className="font-medium">
                    Message
                  </OwnedLabel>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
                    <OwnedTextarea
                      id={messageInputId}
                      aria-describedby={messageCountId}
                      aria-invalid={Boolean(chatError)}
                      value={message}
                      rows={2}
                      {...chatInputProps}
                      className="max-h-28 flex-1"
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
                      pending={sending}
                      pendingLabel="Sending..."
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="min-w-28"
                    >
                      {!sending ? <Send aria-hidden="true" /> : null}
                      {sending ? "Sending..." : "Send"}
                    </OwnedButton>
                  </div>
                  <p
                    id={messageCountId}
                    className="text-meta text-[var(--text-meta)]"
                  >
                    {message.length}/{TEAM_CHAT_MESSAGE_LIMIT} characters
                  </p>
                </div>
              </form>
            ) : undefined
          }
        >
          {!isUserLoaded ? (
            <section className="p-6">
              <div
                role="status"
                className="flex items-center gap-3 text-body text-[var(--text-meta)]"
              >
                Checking account status...
              </div>
            </section>
          ) : !isSignedIn ? (
            <div className="grid h-full min-h-72 place-items-center p-6 text-center">
              <div>
                <MessageSquare
                  className="mx-auto size-8 text-[var(--text-meta)]"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-body font-medium text-[var(--text-primary)]">
                  Team chat is coming later
                </h2>
              </div>
            </div>
          ) : isConvexAuthLoading ? (
            <section className="p-6">
              <div
                role="status"
                className="flex items-center gap-3 text-body text-[var(--text-meta)]"
              >
                Connecting Team Chat...
              </div>
            </section>
          ) : !isConvexAuthenticated ? (
            <section role="alert" className="p-6 text-[var(--status-danger)]">
              <h2 className="text-body font-medium text-[var(--text-primary)]">
                Team Chat is not connected
              </h2>
              <p className="mt-2 text-body">
                Convex has not received your Clerk session. Sign out and back
                in, then retry.
              </p>
            </section>
          ) : teamData === undefined ? (
            <section className="p-6">
              <div
                role="status"
                className="flex items-center gap-3 text-body text-[var(--text-meta)]"
              >
                Loading messages...
              </div>
            </section>
          ) : !teamData ? (
            <section className="grid min-h-72 place-items-center p-6 text-center">
              <div className="max-w-md">
                <Users
                  className="mx-auto size-8 text-[var(--text-meta)]"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-body font-medium text-[var(--text-primary)]">
                  No team workspace yet
                </h2>
                <p className="mt-2 text-body text-[var(--text-meta)]">
                  Create or join a workspace before using Team Chat.
                </p>
              </div>
            </section>
          ) : !canUseChat ? (
            <section className="p-6">
              <h2 className="text-body font-medium text-[var(--text-primary)]">
                Chat unavailable for your role
              </h2>
              <p className="mt-2 text-body text-[var(--text-meta)]">
                Your current role can access the workspace but does not have
                permission to view or send chat messages.
              </p>
            </section>
          ) : (
            <div data-slot="conversation-history" className="min-h-full">
              <ol
                aria-label="Team chat messages"
                className="flex min-h-full flex-col gap-3"
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
                            <span className="text-meta font-medium text-[var(--text-primary)]">
                              {chatMessage.authorName}
                            </span>
                          ) : null}
                          <time className="text-meta text-[var(--text-meta)]">
                            {formatChatTime(chatMessage.createdAt)}
                          </time>
                        </div>
                        <div
                          className={
                            isOwnMessage
                              ? "bg-[var(--surface-active)] px-3 py-2"
                              : "border-t border-[var(--border-hairline)] pt-2"
                          }
                        >
                          <p className="whitespace-pre-wrap text-body [overflow-wrap:anywhere]">
                            {chatMessage.body}
                          </p>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="m-auto max-w-md list-none text-center">
                    <MessageSquare
                      className="mx-auto size-8 text-[var(--text-meta)]"
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 text-body font-medium text-[var(--text-primary)]">
                      No messages yet
                    </h3>
                    <p className="mt-2 text-body text-[var(--text-meta)]">
                      Share an update, a blocker, or a delivery note.
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
