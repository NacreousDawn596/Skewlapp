/**
 * Notification deep-link parsing and validation.
 *
 * Notifications carry a `route` (and optionally a `tab`) in their payload. We
 * never trust an arbitrary route: it is validated against an explicit allowlist
 * before navigation.
 */

export const ALLOWED_NOTIFICATION_ROUTES = ["/notes", "/absences"] as const;

export interface NotificationDestination {
  pathname: string;
  tab?: string;
}

/** Parse and validate a notification payload into a safe destination. */
export function parseNotificationRoute(data: unknown): NotificationDestination | null {
  if (!data || typeof data !== "object") return null;

  const d = data as Record<string, unknown>;
  const raw = d.route;
  if (typeof raw !== "string" || raw.trim().length === 0) return null;

  let pathname = raw.trim();
  let queryTab: string | undefined;

  const qIndex = pathname.indexOf("?");
  if (qIndex >= 0) {
    const query = pathname.slice(qIndex + 1);
    pathname = pathname.slice(0, qIndex);
    const params: Record<string, string> = {};
    query.split("&").forEach((pair) => {
      const eq = pair.indexOf("=");
      if (eq >= 0) {
        const k = pair.slice(0, eq);
        const v = pair.slice(eq + 1);
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    });
    queryTab = params.tab;
  }

  if (!(ALLOWED_NOTIFICATION_ROUTES as readonly string[]).includes(pathname)) {
    return null;
  }

  const dataTab = typeof d.tab === "string" ? d.tab : undefined;
  const tab = queryTab ?? dataTab;

  // Only the absences screen accepts a tab (e.g. "sanctions").
  return { pathname, tab: pathname === "/absences" ? tab : undefined };
}
