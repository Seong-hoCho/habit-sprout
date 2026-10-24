import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Leaf,
  Moon,
  Plus,
  Sparkles,
  SunMedium,
  Target,
  Trash2,
  Trophy,
  Waves,
  Wind,
} from "lucide-react";
import GameCanvas from "@/components/GameCanvas";
import { characters, portraitUrl } from "@/game/characters";
import { addHabit, readHabits, removeHabit, toggleToday, NAME_MAX, STORE_KEY, type SaveResult } from "@/game/habitStore";
import { emitGrowth } from "@/game/events";
import {
  addDays,
  dayStreak,
  growthFromXp,
  habitStreak,
  totalChecks,
  totalXp,
  weekRate,
  xpOnDay,
  ymd,
  XP_PER_CHECK,
  type Habit,
} from "@/game/progress";

const DEMO_MODE = new URLSearchParams(window.location.search).has("demo");

const ICONS = [Waves, SunMedium, Wind, BookOpen, Moon];
const TONES = ["aqua", "sun", "mint", "lavender", "night"];
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function demoHabits(today: string): Habit[] {
  const past = (n: number, skip: number[] = []) =>
    Object.fromEntries(
      Array.from({ length: n }, (_, i) => i + 1)
        .filter((i) => !skip.includes(i))
        .map((i) => [addDays(today, -i), true]),
    );
  return [
    { id: "d1", name: "기상 7시", log: { ...past(18, [5, 11]), [today]: true } },
    { id: "d2", name: "영어 단어 30개", log: { ...past(12, [3]), [today]: true } },
    { id: "d3", name: "계리 문제 5개", log: past(9) },
    { id: "d4", name: "스트레칭 10분", log: past(6, [2]) },
  ];
}

export default function Home() {
  const [today, setToday] = useState(() => ymd(new Date()));
  const [habits, setHabits] = useState<Habit[]>(() => (DEMO_MODE ? demoHabits(ymd(new Date())) : readHabits()));
  const [activeTab, setActiveTab] = useState<"today" | "collection">("today");
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);

  const reload = useCallback(() => {
    if (!DEMO_MODE) setHabits(readHabits());
  }, []);

  // 같은 게임을 연 다른 탭의 변경과 날짜 변경을 따라간다
  useEffect(() => {
    if (DEMO_MODE) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORE_KEY) reload();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setToday(ymd(new Date()));
        reload();
      }
    };
    const tick = window.setInterval(() => setToday(ymd(new Date())), 60_000);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(tick);
    };
  }, [reload]);

  const xp = useMemo(() => totalXp(habits), [habits]);
  const growth = useMemo(() => growthFromXp(xp), [xp]);
  const streak = useMemo(() => dayStreak(habits, today), [habits, today]);
  const week = useMemo(() => weekRate(habits, today), [habits, today]);
  const checks = useMemo(() => totalChecks(habits), [habits]);
  const todayXp = xpOnDay(habits, today);
  const completedCount = habits.filter((h) => h.log[today]).length;
  const progress = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;
  const unlockedCharacters = characters.filter((c) => c.unlockLevel <= growth.level);
  const nextCharacter = characters.find((c) => c.unlockLevel > growth.level);
  const d = new Date(today + "T00:00:00");

  useEffect(() => {
    emitGrowth({ level: growth.level, stage: growth.stage, todayDone: completedCount, todayTotal: habits.length });
  }, [growth.level, growth.stage, completedCount, habits.length]);

  // 데모는 저장소를 건드리지 않고 화면 상태만 바꾼다
  function commit(r: SaveResult) {
    setHabits(r.habits);
    setSaveFailed(!r.saved);
  }

  function toggleHabit(habit: Habit) {
    const wasDone = !!habit.log[today];
    const before = growth.level;

    const optimistic = habits.map((h) => {
      if (h.id !== habit.id) return h;
      const log = { ...h.log };
      if (wasDone) delete log[today];
      else log[today] = true;
      return { ...h, log };
    });
    if (DEMO_MODE) setHabits(optimistic);
    else commit(toggleToday(habit.id, today));

    if (!wasDone) {
      const after = growthFromXp(totalXp(optimistic)).level;
      const unlocked = characters.find((c) => c.unlockLevel > before && c.unlockLevel <= after);
      setCelebrate(
        unlocked
          ? `레벨 ${after}! ${unlocked.name}(${unlocked.title})가 정원에 찾아왔어요.`
          : after > before
            ? `레벨 ${after} 달성! ${habit.name} 완료.`
            : `${habit.name} 완료! 작은 잎이 하나 더 자랐어요.`,
      );
      window.setTimeout(() => setCelebrate(null), 3200);
    } else {
      setCelebrate(null);
    }
  }

  function submitHabit(e: FormEvent) {
    e.preventDefault();
    const name = draft.trim().slice(0, NAME_MAX);
    if (!name) return;
    if (DEMO_MODE) setHabits((hs) => [...hs, { id: `d${Date.now()}`, name, log: {} }]);
    else commit(addHabit(name));
    setDraft("");
  }

  function deleteHabit(habit: Habit) {
    if (!window.confirm(`'${habit.name}' 습관과 그 기록을 지울까요? 이 습관으로 모은 XP도 빠져요.`)) return;
    if (DEMO_MODE) setHabits((hs) => hs.filter((h) => h.id !== habit.id));
    else commit(removeHabit(habit.id));
  }

  const mood = !habits.length
    ? "씨앗을 기다려요"
    : completedCount >= habits.length
      ? "아주 반짝여요"
      : completedCount >= Math.ceil(habits.length / 2)
        ? "포근하게 깨어나요"
        : "당신을 기다려요";

  return (
    <div className="game-shell">
      <GameCanvas />
      <div className="game-backdrop" />
      <div className="grain" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Leaf size={18} strokeWidth={2.4} /></div>
          <div>
            <p className="brand-name">habit sprout</p>
            <p className="brand-kicker">습관으로 자라는 정원</p>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="streak-chip" title="습관을 하나라도 체크한 날이 이어진 일수">
            <Flame size={15} fill="currentColor" />
            <span><b>{streak}</b>일 연속</span>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <aside className="sidebar left-rail">
          <div className="rail-heading">
            <div>
              <p className="eyebrow">{d.getMonth() + 1}월 {d.getDate()}일 {WEEKDAY[d.getDay()]}요일{DEMO_MODE ? " · 데모" : ""}</p>
              <h1>작은 일이<br /><em>자라고 있어요</em></h1>
            </div>
          </div>

          <div className="tab-row" role="tablist" aria-label="게임 메뉴">
            <button className={activeTab === "today" ? "tab active" : "tab"} onClick={() => setActiveTab("today")} role="tab" aria-selected={activeTab === "today"}>오늘의 정원</button>
            <button className={activeTab === "collection" ? "tab active" : "tab"} onClick={() => setActiveTab("collection")} role="tab" aria-selected={activeTab === "collection"}>도감 <span>{unlockedCharacters.length}</span></button>
          </div>

          {activeTab === "today" ? (
            <>
              {habits.length ? (
                <>
                  <div className="today-summary">
                    <div className="summary-line"><span>오늘의 습관</span><strong>{completedCount}<small> / {habits.length}</small></strong></div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                    <div className="summary-meta"><span>{progress === 100 ? "모두 피어났어요 · 보너스 +20" : "천천히, 하나씩"}</span><span>오늘 +{todayXp} XP</span></div>
                  </div>

                  <div className="habit-list">
                    {habits.map((habit, i) => {
                      const done = !!habit.log[today];
                      const Icon = ICONS[i % ICONS.length];
                      const hs = habitStreak(habit, today);
                      const icon = <span className={`habit-icon ${TONES[i % TONES.length]}`}><Icon size={18} strokeWidth={2.2} /></span>;
                      return editing ? (
                        <div key={habit.id} className="habit-card editing">
                          {icon}
                          <span className="habit-copy"><strong>{habit.name}</strong><small>체크 {Object.keys(habit.log).length}번</small></span>
                          <span />
                          <button className="habit-remove" onClick={() => deleteHabit(habit)} aria-label={`${habit.name} 지우기`} title="지우기"><Trash2 size={14} /></button>
                        </div>
                      ) : (
                        <button
                          key={habit.id}
                          className={`habit-card ${done ? "done" : ""}`}
                          onClick={() => toggleHabit(habit)}
                          aria-pressed={done}
                        >
                          {icon}
                          <span className="habit-copy"><strong>{habit.name}</strong><small>{hs ? `${hs}일째 이어가는 중` : "오늘 첫 칸을 채워 보세요"}</small></span>
                          <span className="habit-xp">+{XP_PER_CHECK}<small>XP</small></span>
                          <span className="check-circle">{done ? <Check size={15} strokeWidth={3} /> : null}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="empty-garden">
                  <p className="eyebrow">아직 심은 씨앗이 없어요</p>
                  <h2>첫 습관을<br /><em>심어 보세요</em></h2>
                  <p>체크할 때마다 정원이 자라요. 기록은 이 브라우저에만 저장돼요.</p>
                </div>
              )}
              {(editing || !habits.length) && (
                <form className="habit-form" onSubmit={submitHabit}>
                  <input
                    className="habit-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={NAME_MAX}
                    placeholder="새 습관 이름"
                    aria-label="새 습관 이름"
                  />
                  <button type="submit" className="primary-button" disabled={!draft.trim()}><Plus size={13} /> 심기</button>
                </form>
              )}
              {saveFailed && <p className="sync-note">이 브라우저에 저장하지 못했어요 · 창을 닫으면 기록이 사라질 수 있어요</p>}
              {habits.length > 0 && (
                <button className="add-habit" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
                  <span>{editing ? <Check size={12} /> : "+"}</span>{editing ? "편집 마치기" : "습관 추가·지우기"}
                </button>
              )}
            </>
          ) : (
            <div className="collection-card">
              <div className="collection-heading"><div className="collection-icon"><Trophy size={19} /></div><span className="collection-count">{unlockedCharacters.length} / {characters.length} 발견</span></div>
              <p className="eyebrow">정원 도감</p>
              <h2>함께 자란 친구들<br /><em>도감에 기록됐어요</em></h2>
              <p>레벨이 오를수록 새로운 친구가 정원에 찾아와요. 레벨은 쌓인 습관 기록 전체로 계산해요.</p>
              <div className="collection-grid">
                {characters.map((c) => {
                  const unlocked = c.unlockLevel <= growth.level;
                  const img = unlocked ? portraitUrl(c.id) : null;
                  return (
                    <div key={c.id} className={`collection-entry ${unlocked ? "unlocked" : "locked"}`} title={unlocked ? `${c.name} · ${c.title}` : `레벨 ${c.unlockLevel}에서 발견`}>
                      <div className={`collection-avatar ${c.palette}`}>{img ? <img src={img} alt={`${c.name}, ${c.title}`} /> : <span aria-hidden="true">{unlocked ? c.symbol : "?"}</span>}</div>
                      <strong>{unlocked ? c.name : "???"}</strong>
                      <small>{unlocked ? c.title : `레벨 ${c.unlockLevel}`}</small>
                    </div>
                  );
                })}
              </div>
              {nextCharacter ? (
                <div className="collection-next"><Sparkles size={13} /><span>다음 발견까지 <b>레벨 {nextCharacter.unlockLevel}</b></span></div>
              ) : (
                <div className="collection-next complete"><Sparkles size={13} /><span>모든 친구를 정원에서 만났어요</span></div>
              )}
              <button className="back-to-today" onClick={() => setActiveTab("today")}>오늘의 습관으로 <ChevronRight size={15} /></button>
            </div>
          )}
        </aside>

        <section className="habitat-stage" aria-label="성장하는 정원">
          <div className="stage-label"><span className="live-dot" /> live habitat <span className="stage-season">twilight meadow</span></div>
          <div className="stage-copy" aria-live="polite">
            <p className="eyebrow">지금 동반자는</p>
            <h2>{mood}</h2>
            <p>{celebrate ?? "습관을 체크하면 정원 한가운데의 친구도 함께 자라요."}</p>
          </div>
          <div className="stage-spacer" />
          <div className="habitat-caption"><span className="caption-icon"><Sparkles size={14} /></span><span><b>{growth.stage}</b> 단계</span><span className="caption-divider" /><span>레벨 {growth.level}</span></div>
        </section>

        <aside className="sidebar right-rail">
          <div className="growth-card">
            <div className="growth-card-header"><div><p className="eyebrow">동반자</p><h2>Mossy</h2></div><div className="level-badge"><span>LV</span>{growth.level}</div></div>
            <div className="companion-wrap"><div className="halo halo-one" /><div className="halo halo-two" /><div className="companion-teaser" aria-label="다음 캐릭터를 기다리는 실루엣"><span className="teaser-sprout">?</span><span className="teaser-glint">✦</span></div><div className="companion-spark spark-a">✦</div><div className="companion-spark spark-b">·</div></div>
            <div className="growth-name-row"><span className="growth-title"><span className="status-dot" />{growth.stage} Mossy</span><span className="growth-percent">{growth.currentXp} / {growth.levelSpan} XP</span></div>
            <div className="progress-track growth-track"><div className="progress-fill" style={{ width: `${growth.percent}%` }} /></div>
            <p className="growth-next"><Sparkles size={14} />{growth.next}</p>
          </div>

          <div className="stats-card">
            <div className="card-title-row"><span className="eyebrow">정원 기록</span></div>
            <div className="stat-row"><div className="stat-label"><span className="stat-icon leaf-stat"><Leaf size={14} /></span><span>연속일</span></div><div className="stat-meter"><span style={{ width: `${Math.min(100, (streak / 30) * 100)}%` }} /></div><b>{streak}일</b></div>
            <div className="stat-row"><div className="stat-label"><span className="stat-icon sun-stat"><SunMedium size={14} /></span><span>최근 7일</span></div><div className="stat-meter"><span style={{ width: `${week}%` }} /></div><b>{week}%</b></div>
            <div className="stat-row"><div className="stat-label"><span className="stat-icon target-stat"><Target size={14} /></span><span>누적 체크</span></div><div className="stat-meter"><span style={{ width: `${Math.min(100, (checks / 300) * 100)}%` }} /></div><b>{checks}</b></div>
          </div>

          <div className="quote-card"><span className="quote-mark">“</span><p>성장은 서두르지<br />않아도 일어나요.</p><span className="quote-credit">— Mossy · 누적 {xp} XP</span></div>
        </aside>
      </main>
    </div>
  );
}
