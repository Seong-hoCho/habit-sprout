import { describe, expect, it } from "vitest";
import { addDays, dayStreak, growthFromXp, habitStreak, totalXp, weekRate, xpForLevel, xpOnDay, type DashHabit } from "./progress";

const T = "2026-09-23";
const h = (id: string, days: string[]): DashHabit => ({ id, name: id, log: Object.fromEntries(days.map((d) => [d, true])) });

describe("levels", () => {
  it("thresholds grow by 100·L", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });
  it("derives level, stage and in-level progress", () => {
    expect(growthFromXp(0)).toMatchObject({ level: 1, stage: "새싹", currentXp: 0, levelSpan: 100 });
    expect(growthFromXp(99).level).toBe(1);
    expect(growthFromXp(100)).toMatchObject({ level: 2, stage: "잎새", currentXp: 0, levelSpan: 200 });
    expect(growthFromXp(650)).toMatchObject({ level: 4, currentXp: 50, percent: 13 });
    expect(growthFromXp(3600)).toMatchObject({ level: 9, stage: "숲지기" });
  });
});

describe("xp from dashboard logs", () => {
  it("20 per check plus perfect-day bonus", () => {
    const habits = [h("a", [T, addDays(T, -1)]), h("b", [T])];
    // T: 2 checks (perfect) = 40+20, T-1: 1 check = 20
    expect(totalXp(habits)).toBe(80);
    expect(xpOnDay(habits, T)).toBe(60);
    expect(xpOnDay(habits, addDays(T, -1))).toBe(20);
  });
  it("ignores false entries and empty lists", () => {
    expect(totalXp([])).toBe(0);
    expect(totalXp([{ id: "a", name: "a", log: { [T]: false } }])).toBe(0);
  });
  it("unchecking reverses xp", () => {
    const a = h("a", [T]);
    const before = totalXp([a]);
    delete a.log[T];
    expect(totalXp([a])).toBe(before - 40);
  });
});

describe("streaks", () => {
  it("counts through today, or up to yesterday if today not done", () => {
    const days = [T, addDays(T, -1), addDays(T, -2), addDays(T, -4)];
    expect(dayStreak([h("a", days)], T)).toBe(3);
    expect(dayStreak([h("a", days.slice(1))], T)).toBe(2);
    expect(dayStreak([h("a", [addDays(T, -3)])], T)).toBe(0);
  });
  it("any habit keeps the day streak", () => {
    expect(dayStreak([h("a", [T]), h("b", [addDays(T, -1)])], T)).toBe(2);
  });
  it("per-habit streak matches dashboard rule", () => {
    expect(habitStreak(h("a", [addDays(T, -1), addDays(T, -2)]), T)).toBe(2);
  });
  it("week rate", () => {
    expect(weekRate([h("a", [T, addDays(T, -1)])], T)).toBe(29);
    expect(weekRate([], T)).toBe(0);
  });
  it("crosses month boundaries", () => {
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });
});
