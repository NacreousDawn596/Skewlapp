import { describe, it, expect } from "vitest";
import {
  parseNotificationRoute,
  ALLOWED_NOTIFICATION_ROUTES,
} from "../services/notificationNavigation";

describe("parseNotificationRoute", () => {
  it("accepts the /notes route", () => {
    expect(parseNotificationRoute({ route: "/notes" })).toEqual({ pathname: "/notes", tab: undefined });
  });

  it("accepts the /absences route", () => {
    expect(parseNotificationRoute({ route: "/absences" })).toEqual({
      pathname: "/absences",
      tab: undefined,
    });
  });

  it("parses a query tab for /absences", () => {
    expect(parseNotificationRoute({ route: "/absences?tab=sanctions" })).toEqual({
      pathname: "/absences",
      tab: "sanctions",
    });
  });

  it("reads a tab from the payload", () => {
    expect(parseNotificationRoute({ route: "/absences", tab: "sanctions" })).toEqual({
      pathname: "/absences",
      tab: "sanctions",
    });
  });

  it("ignores invalid routes", () => {
    expect(parseNotificationRoute({ route: "/evil" })).toBeNull();
    expect(parseNotificationRoute({ route: "/notes/../../etc" })).toBeNull();
  });

  it("ignores missing or non-string routes", () => {
    expect(parseNotificationRoute(null)).toBeNull();
    expect(parseNotificationRoute({})).toBeNull();
    expect(parseNotificationRoute({ route: 123 })).toBeNull();
  });

  it("exposes a fixed allowlist", () => {
    expect(ALLOWED_NOTIFICATION_ROUTES).toContain("/notes");
    expect(ALLOWED_NOTIFICATION_ROUTES).toContain("/absences");
  });
});
