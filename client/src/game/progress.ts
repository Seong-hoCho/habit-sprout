/* 성장 규칙 — 전부 대시보드 습관 기록(log)에서 매번 계산한다.
   XP·레벨·연속일을 따로 저장하지 않으므로 체크를 풀면 자동으로 되돌아가고,
   다른 기기에서도 같은 기록이면 같은 레벨이 보인다. */

export type DashHabit = { id: string; name: string; log: Record<string, boolean> };

export const XP_PER_CHECK = 20;
/** 그날 등록된 습관을 모두 체크한 날의 추가 보너스 */
export const PERFECT_DAY_BONUS = 20;

const pad = (n: number) => String(n).padStart(2, "0");
export function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function addDays(day: string, n: number) {
  const d = new Date(day + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** 레벨 L에 도달하는 누적 XP: 0, 100, 300, 600, 1000, 1500 … (다음 레벨까지 100·L) */
export function xpForLevel(level: number) {
  return 50 * level * (level - 1);
}

export const STAGES = ["새싹", "잎새", "덩굴", "꽃봉오리", "숲지기"] as const;

export type Growth = {
  level: number;
  totalXp: number;
  /** 현재 레벨 안에서 모은 XP */
  currentXp: number;
  /** 현재 레벨에서 다음 레벨까지 필요한 XP 전체 */
  levelSpan: number;
  percent: number;
  stage: (typeof STAGES)[number];
  next: string;
};

export function growthFromXp(totalXp: number): Growth {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  const base = xpForLevel(level);
  const levelSpan = xpForLevel(level + 1) - base;
  const currentXp = totalXp - base;
  const stage = STAGES[Math.min(level, STAGES.length) - 1];
  return {
    level,
    totalXp,
    currentXp,
    levelSpan,
    percent: Math.round((currentXp / levelSpan) * 100),
    stage,
    next: `${levelSpan - currentXp} XP 더 모으면 레벨 ${level + 1}`,
  };
}

/** 기록이 있는 모든 날짜별 체크 수 */
function checksByDay(habits: DashHabit[]) {
  const map = new Map<string, number>();
  for (const h of habits) {
    for (const [day, on] of Object.entries(h.log || {})) {
      if (on) map.set(day, (map.get(day) || 0) + 1);
    }
  }
  return map;
}

export function totalXp(habits: DashHabit[]) {
  if (!habits.length) return 0;
  let xp = 0;
  for (const [, n] of checksByDay(habits)) {
    xp += n * XP_PER_CHECK;
    if (n >= habits.length) xp += PERFECT_DAY_BONUS;
  }
  return xp;
}

/** 오늘 얻은 XP (오늘 보너스 포함) */
export function xpOnDay(habits: DashHabit[], day: string) {
  const n = habits.filter((h) => h.log?.[day]).length;
  if (!n) return 0;
  return n * XP_PER_CHECK + (habits.length && n >= habits.length ? PERFECT_DAY_BONUS : 0);
}

/** 습관을 하나라도 체크한 날이 이어진 일수. 오늘 아직 안 했으면 어제까지로 센다. */
export function dayStreak(habits: DashHabit[], today: string) {
  const days = checksByDay(habits);
  let i = days.has(today) ? 0 : 1;
  let streak = 0;
  for (; i < 1000; i++) {
    if (days.has(addDays(today, -i))) streak++;
    else break;
  }
  return streak;
}

/** 습관 하나의 연속일 — 대시보드 streaks()와 같은 규칙 */
export function habitStreak(h: DashHabit, today: string) {
  let cur = 0;
  for (let i = h.log?.[today] ? 0 : 1; i < 400; i++) {
    if (h.log?.[addDays(today, -i)]) cur++;
    else break;
  }
  return cur;
}

/** 최근 7일(오늘 포함) 달성률 0~100 */
export function weekRate(habits: DashHabit[], today: string) {
  if (!habits.length) return 0;
  let hits = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, -i);
    hits += habits.filter((h) => h.log?.[d]).length;
  }
  return Math.round((hits / (habits.length * 7)) * 100);
}

export function totalChecks(habits: DashHabit[]) {
  return habits.reduce((s, h) => s + Object.values(h.log || {}).filter(Boolean).length, 0);
}
