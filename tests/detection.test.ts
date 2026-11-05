import { describe, it, expect } from "vitest";
import {
  detectAbsenceChanges,
  absenceIdentity,
  absenceSignature,
  absenceStatus,
} from "../services/changeDetection";

const oldData = {
  details: [
    { Element: "INFO401_1", Date: "2026-06-01", Seance: "S1", Justif: false, Remarques: "" },
    { Element: "INFO402_1", Date: "2026-06-02", Seance: "S1", Justif: true, Remarques: "" },
  ],
};

describe("absenceIdentity", () => {
  it("builds a stable identity from element, date and session", () => {
    expect(absenceIdentity({ Element: "A", Date: "2026-06-01", Seance: "S1" })).toBe(
      "A|2026-06-01|S1"
    );
  });
  it("returns null for unidentifiable records", () => {
    expect(absenceIdentity(null)).toBeNull();
    expect(absenceIdentity({})).toBeNull();
  });
});

describe("absenceStatus", () => {
  it("normalizes boolean and string justifications", () => {
    expect(absenceStatus({ Justif: true })).toBe("justified");
    expect(absenceStatus({ Justif: false })).toBe("unjustified");
    expect(absenceStatus({ Justifiee: "OUI" })).toBe("justified");
    expect(absenceStatus({ Justifiee: "NON" })).toBe("unjustified");
  });
});

describe("detectAbsenceChanges", () => {
  it("detects a newly added absence", () => {
    const next = {
      details: [
        ...oldData.details,
        { Element: "INFO403_1", Date: "2026-06-03", Seance: "S1", Justif: false, Remarques: "" },
      ],
    };
    const activities = detectAbsenceChanges(oldData, next);
    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe("absence");
    expect(activities[0].title).toBe("Nouvelle absence");
    expect(activities[0].route).toBe("/absences");
  });

  it("detects a justification change on an existing absence", () => {
    const next = {
      details: [
        { Element: "INFO401_1", Date: "2026-06-01", Seance: "S1", Justif: true, Remarques: "" },
        oldData.details[1],
      ],
    };
    const activities = detectAbsenceChanges(oldData, next);
    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe("absence");
  });

  it("does not produce false positives for reordered lists", () => {
    const next = {
      details: [oldData.details[1], oldData.details[0]],
    };
    expect(detectAbsenceChanges(oldData, next)).toHaveLength(0);
  });

  it("does not produce activities for unchanged data", () => {
    expect(detectAbsenceChanges(oldData, oldData)).toHaveLength(0);
  });

  it("deduplicates repeated records sharing an identity", () => {
    const next = {
      details: [
        oldData.details[0],
        { Element: "INFO401_1", Date: "2026-06-01", Seance: "S1", Justif: false, Remarques: "" },
      ],
    };
    // No changes (the duplicate is ignored).
    expect(detectAbsenceChanges(oldData, next)).toHaveLength(0);
  });

  it("keeps an unchanged signature stable", () => {
    expect(
      absenceSignature({ Element: "A", Date: "d", Justif: true, Remarques: "x" })
    ).toBe(absenceSignature({ Element: "A", Date: "d", Justif: true, Remarques: "x" }));
  });
});
