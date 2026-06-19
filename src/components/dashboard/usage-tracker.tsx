"use client";

import Link from "next/link";
import { useEffect } from "react";
import type React from "react";
import type { UsageEventData, UsageEventName } from "@/lib/usage-events";

const SESSION_STORAGE_KEY = "magic_mike_usage_session_id";
const DEFAULT_ENGAGEMENT_SECONDS = 10;

export function trackUsageEvent(
  eventName: UsageEventName,
  data: UsageEventData = {},
  options: { beacon?: boolean } = {},
) {
  if (typeof window === "undefined") return;

  const body = {
    ...data,
    event_name: eventName,
    anonymous_session_id: getAnonymousSessionId(),
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
  };

  const serialized = JSON.stringify(body);

  if (options.beacon && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(
      "/api/usage-events",
      new Blob([serialized], { type: "application/json" }),
    );

    if (sent) return;
  }

  void fetch("/api/usage-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: serialized,
    keepalive: true,
  }).catch(() => {
    // Usage analytics should never interrupt the dashboard experience.
  });
}

export function TrackUsageEvent({
  eventName,
  eventData,
}: {
  eventName: UsageEventName;
  eventData?: UsageEventData;
}) {
  useEffect(() => {
    trackUsageEvent(eventName, eventData);
  }, [eventName, eventData]);

  return null;
}

export function ReportEngagementTracker({
  eventData,
  disabled = false,
  thresholdSeconds = DEFAULT_ENGAGEMENT_SECONDS,
}: {
  eventData: UsageEventData;
  disabled?: boolean;
  thresholdSeconds?: number;
}) {
  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    let activeMs = 0;
    let activeStartedAt: number | null = null;
    let engagedSent = false;
    let finalSent = false;

    const isVisibleAndFocused = () =>
      document.visibilityState === "visible" &&
      (typeof document.hasFocus !== "function" || document.hasFocus());

    const syncActiveTime = () => {
      const now = Date.now();

      if (activeStartedAt !== null) {
        activeMs += now - activeStartedAt;
        activeStartedAt = null;
      }

      if (isVisibleAndFocused()) {
        activeStartedAt = now;
      }

      const activeSeconds = Math.floor(activeMs / 1000);

      if (!engagedSent && activeSeconds >= thresholdSeconds) {
        engagedSent = true;
        trackUsageEvent("report_engaged", {
          ...eventData,
          engagement_seconds: activeSeconds,
          metadata: {
            ...(eventData.metadata || {}),
            threshold_seconds: thresholdSeconds,
          },
        });
      }
    };

    const flushFinal = () => {
      if (finalSent) return;
      syncActiveTime();

      const activeSeconds = Math.floor(activeMs / 1000);
      if (activeSeconds < thresholdSeconds) return;

      finalSent = true;
      trackUsageEvent(
        "report_active_time",
        {
          ...eventData,
          engagement_seconds: activeSeconds,
          metadata: {
            ...(eventData.metadata || {}),
            threshold_seconds: thresholdSeconds,
          },
        },
        { beacon: true },
      );
    };

    syncActiveTime();

    const interval = window.setInterval(syncActiveTime, 1000);
    window.addEventListener("focus", syncActiveTime);
    window.addEventListener("blur", syncActiveTime);
    document.addEventListener("visibilitychange", syncActiveTime);
    window.addEventListener("pagehide", flushFinal);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncActiveTime);
      window.removeEventListener("blur", syncActiveTime);
      document.removeEventListener("visibilitychange", syncActiveTime);
      window.removeEventListener("pagehide", flushFinal);
      flushFinal();
    };
  }, [disabled, eventData, thresholdSeconds]);

  return null;
}

export function TrackedLink({
  href,
  eventName,
  eventData,
  children,
  onClick,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  eventName: UsageEventName;
  eventData?: UsageEventData;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        trackUsageEvent(eventName, eventData);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}

export function TrackedExternalLink({
  href,
  eventName,
  eventData,
  children,
  onClick,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  eventName: UsageEventName;
  eventData?: UsageEventData;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        trackUsageEvent(eventName, eventData);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

function getAnonymousSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const next =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
}
