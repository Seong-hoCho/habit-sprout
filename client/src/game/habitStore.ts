/* 게임 자체 저장소.
   습관과 체크 기록을 localStorage "habit-sprout-v1"에만 둔다.
   다른 앱의 저장소는 읽지도 쓰지도 않는다.
   원칙
   - 체크는 오늘 날짜만 토글한다.
   - XP·레벨은 저장하지 않고 log에서 매번 계산한다(progress.ts).
   - 저장소를 못 쓰는 환경(사생활 보호 창 등)에서도 화면은 그대로 동작한다. */

import type { Habit } from "./progress";

export const STORE_KEY = "habit-sprout-v1";
export const NAME_MAX = 30;

type StoreState = { v: 1; habits: Habit[] };

export function readHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<StoreState>) : null;
    return (s?.habits || [])
      .filter((h) => h && typeof h.id === "string" && typeof h.name === "string")
      .map((h) => ({ id: h.id, name: h.name, log: h.log || {} }));
  } catch {
    return [];
  }
}

/** 저장에 성공하면 true. 실패해도 화면 상태는 호출한 쪽이 그대로 쓴다. */
function writeHabits(habits: Habit[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, habits } satisfies StoreState));
    return true;
  } catch {
    return false;
  }
}

function newId() {
  return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export type SaveResult = { habits: Habit[]; saved: boolean };

/** 저장소의 최신 값 위에 바꾼다 — 다른 탭에서 고친 내용을 덮지 않도록 */
function update(fn: (habits: Habit[]) => Habit[]): SaveResult {
  const habits = fn(readHabits());
  return { habits, saved: writeHabits(habits) };
}

export function toggleToday(habitId: string, day: string): SaveResult {
  return update((habits) =>
    habits.map((h) => {
      if (h.id !== habitId) return h;
      const log = { ...h.log };
      if (log[day]) delete log[day];
      else log[day] = true;
      return { ...h, log };
    }),
  );
}

export function addHabit(name: string): SaveResult {
  const clean = name.trim().slice(0, NAME_MAX);
  return update((habits) => (clean ? [...habits, { id: newId(), name: clean, log: {} }] : habits));
}

export function removeHabit(habitId: string): SaveResult {
  return update((habits) => habits.filter((h) => h.id !== habitId));
}
