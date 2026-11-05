import { describe, it, expect } from "vitest";
import {
  toGradeNumber,
  getPassingThreshold,
  computeElementAverage,
  computeElementAverageWithRatt,
  computeModuleAverage,
  computeGlobalAverage,
  requiredExamScore,
  buildSemesterTrend,
  semesterValue,
  ModuleLookup,
  BaselineResult,
} from "../services/grades";

const COEFS = { coefCc: 1, coefEx: 1, coefTp: 1, coefEcrit: 0 };

describe("toGradeNumber", () => {
  it("handles decimal commas", () => {
    expect(toGradeNumber("15,50")).toBe(15.5);
  });
  it("returns null for absent values", () => {
    expect(toGradeNumber(null)).toBeNull();
    expect(toGradeNumber(undefined)).toBeNull();
    expect(toGradeNumber("")).toBeNull();
    expect(toGradeNumber("--")).toBeNull();
    expect(toGradeNumber("null")).toBeNull();
  });
  it("preserves an explicit zero", () => {
    expect(toGradeNumber(0)).toBe(0);
    expect(toGradeNumber("0")).toBe(0);
  });
});

describe("getPassingThreshold", () => {
  it("returns 11 for 1A and 2A", () => {
    expect(getPassingThreshold("1A")).toBe(11);
    expect(getPassingThreshold("2A")).toBe(11);
  });
  it("returns 12 for 3A, 4A, 5A and unknown", () => {
    expect(getPassingThreshold("3A")).toBe(12);
    expect(getPassingThreshold("4A")).toBe(12);
    expect(getPassingThreshold("5A")).toBe(12);
    expect(getPassingThreshold(null)).toBe(12);
  });
});

describe("computeElementAverage (normal)", () => {
  it("computes a plain weighted average with equal coefficients", () => {
    // coefEcrit falls back to coefCc + coefEx = 2
    // written = (12 + 14) / 2 = 13, eAvg = (13*2 + 10*1)/3 = 36/3 = 12
    expect(computeElementAverage(12, 14, 10, COEFS)).toBeCloseTo(12, 5);
  });
  it("handles missing marks as zero with coefficient counted", () => {
    expect(computeElementAverage(null, 10, 10, COEFS)).toBeCloseTo(20 / 3, 5);
  });
  it("handles division by zero (all coefficients zero)", () => {
    expect(computeElementAverage(12, 14, 10, { coefCc: 0, coefEx: 0, coefTp: 0, coefEcrit: 0 })).toBe(0);
  });
});

describe("computeElementAverageWithRatt (four-candidate formula)", () => {
  it("candidate 1 (N(CC,TP,EX)) wins when the exam is strong", () => {
    // c1=(8+10+8)/3=8.67, c2=(8+5+8)/3=7, c3=(10+8)/3=6, c4=5
    expect(computeElementAverageWithRatt(8, 10, 8, 5, COEFS)).toBeCloseTo(26 / 3, 5);
  });
  it("candidate 2 (N(CC,TP,RATT)) wins", () => {
    // c1=(14+4+8)/3=8.67, c2=(14+8+8)/3=10, c3=(16+8)/3=8, c4=8
    expect(computeElementAverageWithRatt(14, 4, 8, 8, COEFS)).toBeCloseTo(10, 5);
  });
  it("candidate 3 (N(RATT,TP)) wins", () => {
    // c1=(4+4+15)/3=7.67, c2=(4+8+15)/3=9, c3=(16+15)/3=10.33, c4=8
    expect(computeElementAverageWithRatt(4, 4, 15, 8, COEFS)).toBeCloseTo(31 / 3, 5);
  });
  it("candidate 4 (N(RATT)) wins", () => {
    // c1=2, c2=14/3, c3=22/3, c4=10
    expect(computeElementAverageWithRatt(2, 2, 2, 10, COEFS)).toBeCloseTo(10, 5);
  });
  it("caps the result at 11", () => {
    expect(computeElementAverageWithRatt(14, 16, 14, 18, COEFS)).toBe(11);
  });
  it("falls back to the normal calculation when no RATT grade exists", () => {
    // no cap applied: (14+16+14)/3 = 14.67
    expect(computeElementAverageWithRatt(14, 16, 14, null, COEFS)).toBeCloseTo(44 / 3, 5);
  });
  it("treats an explicit RATT zero as recorded (applies the formula and cap)", () => {
    // max = 14.67 -> capped at 11
    expect(computeElementAverageWithRatt(14, 16, 14, 0, COEFS)).toBe(11);
  });
});

describe("module & global averages", () => {
  it("computes weighted module and global averages", () => {
    const moduleAvg = computeModuleAverage([
      { average: 12, coefElem: 1 },
      { average: 14, coefElem: 2 },
    ]);
    expect(moduleAvg).toBeCloseTo((12 + 28) / 3, 5);
    expect(computeGlobalAverage([{ average: 10, coef: 1 }, { average: 12, coef: 1 }])).toBeCloseTo(11, 5);
  });
});

describe("requiredExamScore (goal seek)", () => {
  const modules: ModuleLookup = {
    M1: {
      intitule: "Module 1",
      coef: 1,
      elements: [
        { code: "E1", intitule: "Element 1", coef_cc: 1, coef_ex: 1, coef_tp: 1, coef_ecrit: 2, coef_elem: 1 },
      ],
    },
  };
  const results: Map<string, BaselineResult> = new Map([
    ["E1", { CC: 10, EX: null, TP: 10 }],
  ]);

  it("computes the required exam score", () => {
    const r = requiredExamScore(8, modules, results, {});
    expect(r.status).toBe("required");
    if (r.status === "required") expect(r.required).toBeCloseTo(4, 2);
  });
  it("detects an already-achieved objective", () => {
    const r = requiredExamScore(6, modules, results, {});
    expect(r.status).toBe("already-achieved");
  });
  it("detects an impossible objective", () => {
    const r = requiredExamScore(15, modules, results, {});
    expect(r.status).toBe("impossible");
  });
  it("detects no missing exams", () => {
    const filled: Map<string, BaselineResult> = new Map([
      ["E1", { CC: 10, EX: 12, TP: 10 }],
    ]);
    const r = requiredExamScore(14, modules, filled, {});
    expect(r.status).toBe("no-missing-exams");
  });
});

describe("trend shaping", () => {
  it("extracts semester values and sorts chronologically", () => {
    const points = buildSemesterTrend([
      { Semestre: "S3", AU: "2024/2025", "Moy SEM": "12,5" },
      { Semestre: "S1", AU: "2024/2025", "Moy SEM": 11 },
    ]);
    expect(points.map((p) => p.label)).toEqual(["S1", "S3"]);
    expect(points[1].value).toBeCloseTo(12.5, 5);
  });
  it("marks missing values as unavailable", () => {
    expect(semesterValue({ "Moy SEM": "--" })).toBeNull();
  });
});
