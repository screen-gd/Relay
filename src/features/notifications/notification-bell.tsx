import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useNotificationController } from "./notification-controller";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Popover as OwnedPopover,
  PopoverContent as OwnedPopoverContent,
  PopoverTrigger as OwnedPopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Settings } from "@/components/icons";

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
          size="icon-sm"
          aria-label={
            unreadCount
              ? `Open notifications, ${unreadCount} unread`
              : "Open notifications"
          }
          className="relative data-[state=open]:bg-selected data-[state=open]:text-text-1"
        >
          <Bell aria-hidden="true" />
          {unreadCount ? (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-inner bg-ink px-0.5 text-[10px] leading-none text-text-inverse data"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </OwnedButton>
      </OwnedPopoverTrigger>
      <OwnedPopoverContent
        align="start"
        sideOffset={8}
        aria-label="Notifications"
        className="max-h-[min(32rem,calc(100dvh-4rem))] w-[min(340px,calc(100vw-1rem))] overflow-hidden p-1.5"
      >
        <div className="px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="type-label text-text-1">Notifications</h2>
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
                className="h-auto px-0 py-0 text-text-2 hover:bg-transparent hover:text-text-1"
              >
                Mark all read
              </OwnedButton>
            ) : null}
          </div>
          <p className="mt-0.5 type-body-sm text-text-2">
            {isConvexAuthLoading
              ? "Connecting team notifications..."
              : teamNotificationSyncUnavailable
                ? "Team notifications are not connected"
                : teamNotifications.length
                  ? `${unreadCount} unread team notification${unreadCount === 1 ? "" : "s"}`
                  : "Project activity and feedback"}
          </p>
        </div>
        <div className="mx-0.5 my-1 h-px bg-line-row" />
        {isConvexAuthLoading ? (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-text-2">
            Waiting for Convex auth before loading Team notifications.
          </p>
        ) : teamNotificationSyncUnavailable ? (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-fail-text">
            Clerk is signed in, but Convex auth is not connected. Check Team
            sync before relying on shared notifications.
          </p>
        ) : teamNotifications.length ? (
          <ul className="workspace-scrollbar-hidden max-h-[min(26rem,calc(100dvh-10rem))] space-y-1 overscroll-contain overflow-y-auto py-1">
            {teamNotifications.map((notification) => (
              <li
                key={notification._id}
                className={`rounded-soft px-2.5 py-2 transition-colors duration-(--dur-fast) hover:bg-hover ${notification.read ? "" : "bg-selected"}`}
              >
                <p className="type-label text-text-1">{notification.message}</p>
                <p className="mt-0.5 text-xs text-text-2">
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
                    className="mt-1 h-auto px-0 py-0 text-text-2 hover:bg-transparent hover:text-text-1"
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
                  className="mt-1 ms-3 inline-flex type-label-sm text-text-2 hover:text-text-1 hover:underline"
                >
                  Open Team
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-1 px-2.5 py-3">
            <p className="type-label text-text-1">No new notifications</p>
            <p className="type-body-sm text-text-2">
              Project updates and feedback will appear here.
            </p>
          </div>
        )}
        <div className="mx-0.5 my-1 h-px bg-line-row" />
        <Link
          to="/settings"
          onClick={() => setNotificationOpen(false)}
          className="menu-item"
        >
          <Settings className="size-4 text-text-2" aria-hidden="true" />
          Notification settings
        </Link>
      </OwnedPopoverContent>
    </OwnedPopover>
  );
}
