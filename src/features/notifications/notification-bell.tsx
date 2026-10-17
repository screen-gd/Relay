import { Bell, Check, Settings } from "@/components/icons";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Popover as OwnedPopover,
  PopoverContent as OwnedPopoverContent,
  PopoverTrigger as OwnedPopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useNotificationController } from "./notification-controller";

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
          className="relative transition-colors"
        >
          <Bell aria-hidden="true" className="size-4" />
          {unreadCount ? (
            <span className="absolute -right-1 -top-1 grid min-w-5 h-5 place-items-center rounded-sm bg-[var(--surface-active)] px-1 font-mono text-meta text-[var(--text-primary)]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </OwnedButton>
      </OwnedPopoverTrigger>
      <OwnedPopoverContent
        align="end"
        sideOffset={8}
        aria-label="Notifications"
        className="max-h-[min(32rem,calc(100dvh-4rem))] w-[min(340px,calc(100vw-1rem))] overflow-hidden"
      >
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-body font-semibold">Notifications</h2>
            {teamData && unreadCount ? (
              <OwnedButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  markAllNotificationsRead({
                    teamId: teamData.workspace._id,
                  }).catch(() => undefined);
                }}
                className=""
              >
                Mark all read
              </OwnedButton>
            ) : null}
          </div>
          <p className="mt-1 text-meta text-[var(--text-meta)]">
            {isConvexAuthLoading
              ? "Connecting team notifications..."
              : teamNotificationSyncUnavailable
                ? "Team notifications are not connected"
                : teamNotifications.length
                  ? `${unreadCount} unread team notification${unreadCount === 1 ? "" : "s"}`
                  : "Project activity and feedback"}
          </p>
        </div>
        <div className="h-1" />
        {isConvexAuthLoading ? (
          <p className="px-3 py-3 text-meta text-[var(--text-meta)]">
            Waiting for Convex auth before loading Team notifications.
          </p>
        ) : teamNotificationSyncUnavailable ? (
          <p className="px-3 py-3 text-meta text-[var(--status-danger)]">
            Clerk is signed in, but Convex auth is not connected. Check Team
            sync before relying on shared notifications.
          </p>
        ) : teamNotifications.length ? (
          <ul className="workspace-scrollbar-hidden max-h-[min(26rem,calc(100dvh-10rem))] space-y-1 overscroll-contain overflow-y-auto py-1">
            {teamNotifications.map((notification) => (
              <li
                key={notification._id}
                className={`rounded-md px-3 py-2 transition-colors hover:bg-[var(--surface-fill)] ${notification.read ? "" : "bg-[var(--surface-active)]"}`}
              >
                <p className="text-body font-semibold">
                  {notification.message}
                </p>
                <p className="mt-1 text-meta text-[var(--text-meta)]">
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
                    size="sm"
                    onClick={() => {
                      markNotificationRead({
                        notificationId: notification._id,
                      }).catch(() => undefined);
                    }}
                    className="mt-1"
                  >
                    Mark read
                  </OwnedButton>
                ) : null}
                <Link
                  to="/team"
                  onClick={() => {
                    setNotificationOpen(false);
                    if (!notification.read) {
                      void markNotificationRead({
                        notificationId: notification._id,
                      });
                    }
                  }}
                  className="mt-1 inline-flex min-h-6 items-center text-body text-[var(--text-primary)] underline"
                >
                  Open Team
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid justify-items-center gap-2 px-4 py-8 text-center">
            <Check
              className="size-5 text-[var(--text-primary)]"
              aria-hidden="true"
            />
            <p className="text-body font-semibold">No new notifications</p>
            <p className="max-w-56 text-meta text-[var(--text-meta)]">
              Project updates and feedback will appear here.
            </p>
          </div>
        )}
        <div className="h-1" />
        <Link
          to="/settings"
          onClick={() => setNotificationOpen(false)}
          className="flex h-9 items-center gap-2 rounded-md px-3 text-meta font-medium transition-colors hover:bg-[var(--surface-fill)] focus-visible:bg-[var(--surface-fill)]"
        >
          <Settings
            className="size-4 text-[var(--text-primary)]"
            aria-hidden="true"
          />
          Notification settings
        </Link>
      </OwnedPopoverContent>
    </OwnedPopover>
  );
}
