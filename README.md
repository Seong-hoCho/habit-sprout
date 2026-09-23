# Habit Sprout — 대시보드 연동판

`Code/habit-game`(Manus 원본)을 대시보드 습관 기록에 연결해 GitHub Pages에 올릴 수 있게 정리한 버전. 원본 폴더는 참고용으로 그대로 둔다.

- 저장소: `Seong-hoCho/habit-sprout` (공개) — `main`에 push하면 GitHub Actions가 빌드·배포
- 배포 주소: `https://seong-hocho.github.io/habit-sprout/`
- 대시보드와 같은 출처라서 localStorage `daily-dashboard-v1`을 그대로 읽고 쓴다.

## 원본에서 바뀐 점

| 항목 | 원본 (Manus) | 지금 |
|---|---|---|
| 습관 | 샘플 5개 하드코딩 | 대시보드 `S.habits` (`{id, name, log:{날짜:true}}`) |
| 저장 | `habit-sprout-save` 별도 키 | 저장 안 함. XP·레벨·연속일은 매번 `log`에서 계산 |
| 체크 | 날짜 없음 → 다음 날에도 안 풀림 | 오늘 날짜 `log[today]`만 토글 |
| 연속일 | 6으로 고정 | 습관을 하나라도 체크한 날이 이어진 일수 |
| 동기화 | 없음 | 브리지(scriptUrl) 설정 시 대시보드와 같은 규칙으로 loadState/saveState |
| 캐릭터 이미지 | `/manus-storage/...` (Manus 안에서만 열림) | 기호로 대체. 이미지를 받으면 `client/public/assets/<id>.png` + `characters.ts`의 `PORTRAIT_IDS`에 추가 |
| 배경 | Manus 저장소 이미지 | CSS 그라디언트 |
| 의존성 | shadcn/radix/express 등 60여 개 | react, react-dom, @babylonjs/core, lucide-react |
| Babylon 번들 | 루트 import, 메인 청크에 포함 | 경로별 import + 동적 로딩 (HUD 먼저 뜸) |
| 작은 글자 | 7~10px | 10~11px로 상향 |

## 성장 규칙 (`client/src/game/progress.ts`)

- 체크 1개 = 20 XP. 그날 모든 습관을 체크하면 +20 보너스
- 레벨 L 도달 누적 XP = 50·L·(L−1) → 100, 300, 600, 1000, 1500 …
- 단계: 새싹(1) · 잎새(2) · 덩굴(3) · 꽃봉오리(4) · 숲지기(5+)
- 도감 해금: Mossy 1 · Bloom 3 · Pebble 5 · Luna 7 · Ember 9
- 과거 기록도 그대로 XP가 되고, 습관을 지우면 그 습관의 XP도 빠진다

## 쓰기 안전 규칙 (`client/src/game/dashboardStore.ts`)

- 게임은 **오늘 날짜의 습관 체크만** 바꾼다. 습관 추가·지난 날짜 수정은 대시보드에서
- 쓸 때 `savedAt`을 갱신한다 (대시보드 `save()`와 동일)
- 브리지가 있으면: 원격을 먼저 읽고, 원격이 더 최신이면 그 위에 체크를 얹어 로컬·원격 모두 저장
- 원격을 못 읽으면 **원격을 덮어쓰지 않는다**. 로컬에만 저장하고, 대시보드를 다음에 열 때 올라간다
- 다른 탭의 대시보드가 바꾸면 `storage` 이벤트로 게임이 따라간다
- 반대 방향(게임에서 체크 → 열려 있는 대시보드 탭)은 대시보드의 `storage` 리스너가 받는다 (2026-09-23 볼트본에 포함, 대시보드 배포 필요)

## 명령

```bash
pnpm install
pnpm dev      # http://localhost:5173/habit-sprout/
pnpm check    # 타입 검사
pnpm test     # 성장 규칙 단위 테스트
pnpm build    # dist/ (배포는 Actions가 함)
```

`/habit-sprout/?demo` — 가짜 습관으로 화면 확인 (저장소를 건드리지 않음)

## 처음 한 번 올리기

1. GitHub에서 **빈 공개 저장소** `habit-sprout` 생성 (README·.gitignore 추가하지 않기)
2. 이 폴더에서:

```powershell
cd "C:\Users\82104\Documents\26S\Code\habit-sprout"
git init -b main
git add .
git commit -m "Habit Sprout: 대시보드 습관 연동판"
git remote add origin https://github.com/Seong-hoCho/habit-sprout.git
git push -u origin main
```

3. 저장소 Settings → Pages → Build and deployment → Source: **GitHub Actions**
4. Actions 탭에서 "Deploy to GitHub Pages"가 초록색이 되면 주소 확인 (처음이면 Source를 바꾼 뒤 Actions → Re-run)

이후엔 수정 → `git add . && git commit -m "..." && git push`만 하면 된다.
