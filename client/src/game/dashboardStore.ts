/* 대시보드 저장소 연결.
   게임은 같은 출처(seong-hocho.github.io)에서 열리므로 대시보드의
   localStorage 키 "daily-dashboard-v1"을 그대로 읽고 쓴다.
   원칙
   - 원본은 대시보드 상태 하나다. 게임은 오늘 날짜의 습관 체크만 바꾼다.
   - 쓸 때는 대시보드 save()처럼 savedAt을 갱신한다.
   - 브리지(scriptUrl)가 설정돼 있으면 대시보드와 같은 규칙으로 동기화한다:
     원격이 더 최신이면 먼저 받아 그 위에 체크를 얹고, 원격을 못 읽었으면
     원격을 절대 덮어쓰지 않는다(로컬만 저장 → 대시보드가 다음에 올린다). */

import type { DashHabit } from "./progress";

export const DASH_KEY = "daily-dashboard-v1";
const TIMEOUT_MS = 20000;

type DashState = {
  savedAt?: number;
  habits?: DashHabit[];
  settings?: { scriptUrl?: string; scriptToken?: string };
  [k: string]: unknown;
};

export type SyncStatus = "local" | "synced" | "offline" | "pending";

export function readState(): DashState | null {
  try {
    const raw = localStorage.getItem(DASH_KEY);
    return raw ? (JSON.parse(raw) as DashState) : null;
  } catch {
    return null;
  }
}

function writeState(s: DashState) {
  localStorage.setItem(DASH_KEY, JSON.stringify(s));
}

export function readHabits(): DashHabit[] {
  const s = readState();
  return (s?.habits || []).map((h) => ({ id: h.id, name: h.name, log: h.log || {} }));
}

function bridge(s: DashState | null) {
  const url = (s?.settings?.scriptUrl || "").trim();
  return url ? { url, token: s?.settings?.scriptToken || "" } : null;
}

async function call(b: { url: string; token: string }, payload: Record<string, unknown>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(b.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: b.token, ...payload }),
      redirect: "follow",
      signal: ctrl.signal,
    });
    const data = await res.json();
    return data && data.ok ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 반환: ok=false면 원격을 못 읽음. state=null이면 원격에 아직 데이터 없음 */
async function pullRemote(b: { url: string; token: string }): Promise<{ ok: boolean; state: DashState | null }> {
  const res = await call(b, { action: "loadState" });
  if (!res) return { ok: false, state: null };
  if (!res.data) return { ok: true, state: null };
  try {
    return { ok: true, state: JSON.parse(res.data) };
  } catch {
    return { ok: false, state: null };
  }
}

/** 게임을 열 때: 원격이 더 최신이면 로컬에 받아둔다(대시보드 부팅과 같은 규칙) */
export async function refreshFromRemote(): Promise<SyncStatus> {
  const local = readState();
  const b = bridge(local);
  if (!b) return "local";
  const pull = await pullRemote(b);
  if (!pull.ok) return "offline";
  if (pull.state && (pull.state.savedAt || 0) > (local?.savedAt || 0)) {
    writeState({ ...local, ...pull.state });
  }
  return "synced";
}

let queue: Promise<unknown> = Promise.resolve();

/** 오늘 습관 체크 토글. 호출이 겹치면 순서대로 처리한다. */
export function toggleHabitOn(habitId: string, day: string): Promise<SyncStatus> {
  const job = queue.then(() => doToggle(habitId, day));
  queue = job.catch(() => undefined);
  return job;
}

function applyToggle(s: DashState, habitId: string, day: string) {
  const h = (s.habits || []).find((x) => x.id === habitId);
  if (!h) return false;
  h.log = h.log || {};
  if (h.log[day]) delete h.log[day];
  else h.log[day] = true;
  s.savedAt = Date.now();
  return true;
}

async function doToggle(habitId: string, day: string): Promise<SyncStatus> {
  const local = readState();
  if (!local) throw new Error("대시보드 데이터가 없습니다");
  const b = bridge(local);

  if (!b) {
    if (!applyToggle(local, habitId, day)) throw new Error("습관을 찾지 못했습니다");
    writeState(local);
    return "local";
  }

  const pull = await pullRemote(b);
  let base = local;
  if (pull.ok && pull.state && (pull.state.savedAt || 0) > (local.savedAt || 0)) {
    base = { ...local, ...pull.state };
  }
  if (!applyToggle(base, habitId, day)) throw new Error("습관을 찾지 못했습니다");
  writeState(base);

  if (!pull.ok) return "pending"; // 원격을 못 읽었으니 덮어쓰지 않는다
  const pushed = await call(b, { action: "saveState", data: JSON.stringify(base) });
  return pushed ? "synced" : "pending";
}
