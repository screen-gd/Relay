"use client";

import { useState } from "react";
import Link from "next/link";
import type { SettingsState } from "@/lib/types";
import { useNotificationController } from "./notification-controller";
import { notificationCopy } from "./notification-copy";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  DropdownMenu as OwnedDropdownMenu,
  DropdownMenuContent as OwnedDropdownMenuContent,
  DropdownMenuSeparator as OwnedDropdownMenuSeparator,
  DropdownMenuTrigger as OwnedDropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

export function NotificationBell({ settings }: { settings: SettingsState }) {
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
  const enabledNotifications = Object.entries(settings.notifications).filter(
    ([, enabled]) => enabled
  );
  const teamNotifications = teamData?.notifications ?? [];
  const unreadCount = teamNotifications.filter(
    (notification) => !notification.read
  ).length;
  const teamNotificationSyncUnavailable = Boolean(
    isUserLoaded && isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated
  );

  return (
    <OwnedDropdownMenu
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
      <OwnedDropdownMenuTrigger asChild>
        <OwnedButton
          type="button"
          variant="ghost"
          size="icon"
          title="Notifications"
          aria-label="Open notifications"
          aria-haspopup="dialog"
          className="relative text-[var(--app-ink)]"
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
      </OwnedDropdownMenuTrigger>
      <OwnedDropdownMenuContent
        align="end"
        sideOffset={6}
        aria-label="Notifications"
        className="max-h-[min(32rem,calc(100dvh-4rem))] w-[310px] overflow-hidden border-[var(--app-border)] bg-[var(--app-panel)] p-0 text-[var(--app-ink)] shadow-[var(--app-shadow-2)]"
      >
        <div className="px-3 py-2">
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
                  : enabledNotifications.length
                    ? `${enabledNotifications.length} notification types enabled`
                    : "No notifications yet"}
          </p>
        </div>
        <OwnedDropdownMenuSeparator className="border-[var(--app-border)]" />
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
          <ul className="workspace-scrollbar-hidden max-h-[min(26rem,calc(100dvh-10rem))] overscroll-contain overflow-y-auto">
            {teamNotifications.map((notification) => (
              <li
                key={notification._id}
                className={`px-3 py-2 ${notification.read ? "bg-[var(--app-panel)]" : "bg-[var(--app-active)]"}`}
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
        ) : enabledNotifications.length ? (
          <ul className="workspace-scrollbar-hidden max-h-[min(26rem,calc(100dvh-10rem))] overscroll-contain overflow-y-auto">
            {enabledNotifications.map(([name]) => (
              <li key={name} className="px-3 py-2">
                <p className="text-[13px] font-semibold">{name}</p>
                <p className="text-xs text-[var(--app-muted)]">
                  {notificationCopy(name)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-[var(--app-muted)]">
            Turn on deadline, feedback, or weekly summary notifications from
            Settings.
          </p>
        )}
      </OwnedDropdownMenuContent>
    </OwnedDropdownMenu>
  );
}
