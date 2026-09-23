/* React(HUD) → Babylon(장면) 단방향 계약.
   장면이 비동기로 늦게 뜰 수 있으므로 마지막 값을 보관해 두고 장면이 시작할 때 읽는다. */
export const GROWTH_EVENT = "habit:sprout-growth";

export type GrowthSignal = { level: number; stage: string; todayDone: number; todayTotal: number };

let last: GrowthSignal | null = null;

export function emitGrowth(detail: GrowthSignal) {
  last = detail;
  window.dispatchEvent(new CustomEvent<GrowthSignal>(GROWTH_EVENT, { detail }));
}

export function lastGrowth() {
  return last;
}
