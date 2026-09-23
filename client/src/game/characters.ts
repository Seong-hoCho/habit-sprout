export type Character = {
  id: string;
  name: string;
  title: string;
  unlockLevel: number;
  palette: string;
  symbol: string;
};

export const characters: Character[] = [
  { id: "mossy", name: "Mossy", title: "덩굴 새싹", unlockLevel: 1, palette: "moss", symbol: "☘" },
  { id: "bloom", name: "Bloom", title: "꽃봉오리", unlockLevel: 3, palette: "bloom", symbol: "❀" },
  { id: "pebble", name: "Pebble", title: "달빛 돌멩이", unlockLevel: 5, palette: "pebble", symbol: "●" },
  { id: "luna", name: "Luna", title: "별빛 나방", unlockLevel: 7, palette: "luna", symbol: "☾" },
  { id: "ember", name: "Ember", title: "불씨 여우", unlockLevel: 9, palette: "ember", symbol: "✦" },
];

/* Manus에서 만든 초상 이미지. 파일을 client/public/assets/에 넣고
   여기에 id를 추가하면 도감이 기호 대신 그림을 보여준다. */
const PORTRAIT_IDS: string[] = [];

export function portraitUrl(id: string) {
  return PORTRAIT_IDS.includes(id) ? `${import.meta.env.BASE_URL}assets/${id}.png` : null;
}
