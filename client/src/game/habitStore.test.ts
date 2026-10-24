import { beforeEach, describe, expect, it } from "vitest";
import { addHabit, readHabits, removeHabit, toggleToday, NAME_MAX, STORE_KEY } from "./habitStore";

// vitest 기본 환경(node)에는 localStorage가 없어 최소한의 대역을 둔다
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
const g = globalThis as { localStorage?: unknown };

describe("habitStore", () => {
  beforeEach(() => { g.localStorage = new MemStorage(); });

  it("빈 저장소면 습관이 없다", () => {
    expect(readHabits()).toEqual([]);
  });

  it("자기 키에만 쓰고 다른 키는 건드리지 않는다", () => {
    const ls = g.localStorage as MemStorage;
    ls.setItem("daily-dashboard-v1", "keep");
    addHabit("물 마시기");
    expect(ls.getItem("daily-dashboard-v1")).toBe("keep");
    expect(JSON.parse(ls.getItem(STORE_KEY)!).habits[0].name).toBe("물 마시기");
  });

  it("추가·오늘 토글·삭제", () => {
    const { habits } = addHabit("  스트레칭  ");
    expect(habits).toHaveLength(1);
    expect(habits[0].name).toBe("스트레칭");
    const id = habits[0].id;
    expect(toggleToday(id, "2026-10-24").habits[0].log).toEqual({ "2026-10-24": true });
    expect(toggleToday(id, "2026-10-24").habits[0].log).toEqual({});
    expect(removeHabit(id).habits).toEqual([]);
    expect(readHabits()).toEqual([]);
  });

  it("빈 이름은 무시하고 긴 이름은 자른다", () => {
    expect(addHabit("   ").habits).toEqual([]);
    expect(addHabit("가".repeat(50)).habits[0].name).toHaveLength(NAME_MAX);
  });

  it("다른 탭이 쓴 최신 값 위에 바꾼다", () => {
    const a = addHabit("A").habits[0];
    (g.localStorage as MemStorage).setItem(STORE_KEY, JSON.stringify({ v: 1, habits: [a, { id: "x", name: "B", log: {} }] }));
    expect(toggleToday(a.id, "2026-10-24").habits.map((h) => h.name)).toEqual(["A", "B"]);
  });

  it("깨진 값이나 저장 실패에도 던지지 않는다", () => {
    (g.localStorage as MemStorage).setItem(STORE_KEY, "{bad");
    expect(readHabits()).toEqual([]);
    g.localStorage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    const r = addHabit("C");
    expect(r.saved).toBe(false);
    expect(r.habits.map((h) => h.name)).toEqual(["C"]);
  });
});
