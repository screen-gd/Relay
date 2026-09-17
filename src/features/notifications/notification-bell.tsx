"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotificationController } from "./notification-controller";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Popover as OwnedPopover,
  PopoverContent as OwnedPopoverContent,
  PopoverTrigger as OwnedPopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, Settings } from "lucide-react";

export function NotificationBell() {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const {
    isSignedIn,
    isUserLoaded,
    isConvexAuthenticated,
    isConvexAuthLoading,
    teamData,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotificationController();
  const teamNotifications = teamData?.notifications ?? [];
  const unreadCount = teamNotifications.filter(
    (notification) => !notification.read
  ).length;
  const teamNotificationSyncUnavailable = Boolean(
    isUserLoaded && isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated
  );

  return (
    <OwnedPopover
      open={notificationOpen}
      onOpenChange={(open) => {
        setNotificationOpen(open);
        if (open && teamData && unreadCount) {
          void markAllNotificationsRead({
            teamId: teamData.workspace._id,
          }).catch(() => undefined);
        }
      }}
    >
      <OwnedPopoverTrigger asChild>
        <OwnedButton
          type="button"
          variant="ghost"
          size="icon"
          title="Notifications"
          aria-label="Open notifications"
          className="relative text-[var(--app-ink)] transition-colors data-[state=open]:bg-[var(--app-active)]"
        >
          <Bell aria-hidden="true" className="size-[18px]" />
          {unreadCount ? (
            <span
              className={`absolute grid h-[17px] place-items-center rounded-full border-2 border-[var(--app-panel)] bg-[var(--app-danger)] text-[9px] leading-none font-extrabold text-white ${
                unreadCount > 9
                  ? "-right-1 top-px min-w-6 px-1"
                  : "top-1 right-0.5 min-w-[17px]"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </OwnedButton>
      </OwnedPopoverTrigger>
      <OwnedPopoverContent
        align="end"
        sideOffset={8}
        aria-label="Notifications"
        className="workspace-flyout max-h-[min(32rem,calc(100dvh-4rem))] w-[min(340px,calc(100vw-1rem))] overflow-hidden rounded-xl border-[var(--app-border)] bg-[var(--app-panel)] p-1.5 text-[var(--app-ink)] shadow-[var(--app-shadow-2)]"
      >
        <div className="px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold">Notifications</h2>
            {teamData && unreadCount ? (
              <OwnedButton
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  markAllNotificationsRead({
                    teamId: teamData.workspace._id,
                  }).catch(() => undefined);
                }}
                className="h-auto px-0 py-0 text-[11px] font-semibold text-[var(--app-accent)] hover:bg-transparent"
              >
                Mark all read
              </OwnedButton>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">
            {isConvexAuthLoading
              ? "Connecting team notifications..."
              : teamNotificationSyncUnavailable
                ? "Team notifications are not connected"
                : teamNotifications.length
                  ? `${unreadCount} unread team notification${unreadCount === 1 ? "" : "s"}`
                  : "Project activity and feedback"}
          </p>
        </div>
        <div className="mx-0.5 my-1 h-px bg-[var(--app-border)]" />
        {isConvexAuthLoading ? (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-[var(--app-muted)]">
            Waiting for Convex auth before loading Team notifications.
          </p>
        ) : teamNotificationSyncUnavailable ? (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-[var(--app-danger)]">
            Clerk is signed in, but Convex auth is not connected. Check Team
            sync before relying on shared notifications.
          </p>
        ) : teamNotifications.length ? (
          <ul className="workspace-scrollbar-hidden max-h-[min(26rem,calc(100dvh-10rem))] space-y-1 overscroll-contain overflow-y-auto py-1">
            {teamNotifications.map((notification) => (
              <li
                key={notification._id}
                className={`rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--app-hover)] ${notification.read ? "" : "bg-[var(--app-active)]"}`}
              >
                <p className="text-[13px] font-semibold">
                  {notification.message}
                </p>
                <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(notification.createdAt))}
                </p>
                {!notification.read ? (
                  <OwnedButton
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      markNotificationRead({
                        notificationId: notification._id,
                      }).catch(() => undefined);
                    }}
                    className="mt-1 h-auto px-0 py-0 text-[11px] font-semibold text-[var(--app-accent)] hover:bg-transparent"
                  >
                    Mark read
                  </OwnedButton>
                ) : null}
                <Link
                  href="/team"
                  onClick={() => {
                    setNotificationOpen(false);
                    if (!notification.read) {
                      void markNotificationRead({
                        notificationId: notification._id,
                      });
                    }
                  }}
                  className="mt-1 inline-flex text-[11px] font-semibold text-[var(--app-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  Open Team
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid justify-items-center gap-2 px-4 py-7 text-center">
            <Check
              className="size-5 text-[var(--app-accent)]"
              aria-hidden="true"
            />
            <p className="text-[13px] font-semibold">No new notifications</p>
            <p className="max-w-56 text-xs text-[var(--app-muted)]">
              Project updates and feedback will appear here.
            </p>
          </div>
        )}
        <div className="mx-0.5 my-1 h-px bg-[var(--app-border)]" />
        <Link
          href="/settings"
          onClick={() => setNotificationOpen(false)}
          className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-medium outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:bg-[var(--app-hover)]"
        >
          <Settings
            className="size-4 text-[var(--app-muted)]"
            aria-hidden="true"
          />
          Notification settings
        </Link>
      </OwnedPopoverContent>
    </OwnedPopover>
  );
}
