"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/components/dashboard/time";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function getNotificationVerb(type: string) {
  switch (type) {
    case "bookmark_saved":
      return "saved";
    case "bookmark_starred":
      return "starred";
    case "new_follower":
      return "followed you";
    case "followee_bookmark":
      return "bookmarked";
    default:
      return "interacted with";
  }
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

type NotificationRowProps = {
  notification: {
    id: Id<"notifications">;
    type: string;
    actorName: string;
    actorUsername: string | null;
    actorImage: string | null;
    bookmarkTitle: string | null;
    bookmarkUrl: string | null;
    read: boolean;
    createdAt: number;
  };
};

function NotificationRow({ notification }: NotificationRowProps) {
  const markAsRead = useMutation(api.notifications.markAsRead);
  const router = useRouter();

  const handleClick = () => {
    if (!notification.read) {
      markAsRead({ notificationId: notification.id }).catch(console.error);
    }
    if (notification.actorUsername) {
      router.push(`/profile/${notification.actorUsername}`);
    }
  };

  const verb = getNotificationVerb(notification.type);
  const initials = getInitials(notification.actorName);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: simple panel interaction
    // biome-ignore lint/a11y/useSemanticElements: notification row contains block elements
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      className={cn(
        "group flex cursor-pointer items-start gap-3 border-border/40 border-b p-4 transition-colors hover:bg-muted/50",
        !notification.read ? "bg-primary/5" : "bg-transparent",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-serif text-muted-foreground text-sm">
        {initials}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-foreground text-sm">
          <span className="font-medium">{notification.actorName}</span> {verb}
          {notification.type === "bookmark_saved" ||
          notification.type === "bookmark_starred"
            ? " your bookmark"
            : ""}
        </p>

        {notification.bookmarkTitle ? (
          <p className="line-clamp-1 text-muted-foreground text-xs">
            {notification.bookmarkTitle}
          </p>
        ) : null}

        <p className="text-[11px] text-muted-foreground/60">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {!notification.read && (
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );
}

export function NotificationPanel({ trigger }: { trigger: ReactElement }) {
  const data = useQuery(api.notifications.getNotifications, { limit: 50 });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (_error) {
      toast.error("Failed to mark all as read");
    }
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const isLoading = data === undefined;

  return (
    <Sheet>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-border/60 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-serif text-2xl tracking-tight">
              Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleMarkAllRead}
                className="text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 font-medium text-muted-foreground text-sm">
                No notifications yet
              </p>
              <p className="mt-1 text-muted-foreground/60 text-xs">
                You'll see activity here when people interact with your
                bookmarks.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
