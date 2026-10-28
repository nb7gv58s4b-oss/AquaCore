import { useSyncExternalStore } from "react";

/** All data lives in this browser's localStorage (local mode). */
export const STORAGE_KEY = "acquario-diario:v1";

export type Num = number | null;

export interface WaterTest {
  id: string;
  datetime: string; // YYYY-MM-DDTHH:mm (local)
  temp: Num;
  ph: Num;
  gh: Num;
  kh: Num;
  no2: Num;
  no3: Num;
  note: string;
}

export const EVENT_TYPES = [
  "Cambio d'acqua",
  "Potatura",
  "Fertilizzante",
  "Regolazione CO2",
  "Illuminazione",
  "Inserimento piante",
  "Inserimento pesci",
  "Altro",
] as const;

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: string;
  text: string;
}

export interface Maintenance {
  id: string;
  date: string; // last done, YYYY-MM-DD
  description: string;
  frequencyDays: Num;
  reminder: string | null; // explicit reminder date
}

export interface Photo {
  id: string;
  date: string;
  caption: string;
  dataUrl: string;
}

export interface Settings {
  tankName: string;
  liters: Num;
}

export interface AppData {
  tests: WaterTest[];
  journal: JournalEntry[];
  maintenance: Maintenance[];
  photos: Photo[];
  settings: Settings;
}

export const emptyData = (): AppData => ({
  tests: [],
  journal: [],
  maintenance: [],
  photos: [],
  settings: { tankName: "", liters: null },
});

type Collection = "tests" | "journal" | "maintenance" | "photos";

let state: AppData = emptyData();
let loaded = false;
const listeners = new Set<() => void>();
const SERVER = emptyData();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    state = emptyData();
  }
}

function commit(next: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Spazio di archiviazione del dispositivo esaurito. Elimina alcune foto o fai un backup.",
    );
  }
  state = next;
  listeners.forEach((l) => l());
}

export function useData(): AppData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => SERVER,
  );
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function upsert<C extends Collection>(col: C, item: AppData[C][number]) {
  load();
  const list = state[col] as { id: string }[];
  const exists = list.some((x) => x.id === item.id);
  const nextList = exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
  commit({ ...state, [col]: nextList });
}

export function remove(col: Collection, id: string) {
  load();
  commit({ ...state, [col]: (state[col] as { id: string }[]).filter((x) => x.id !== id) });
}

export function saveSettings(settings: Settings) {
  load();
  commit({ ...state, settings });
}

export function replaceAll(data: AppData) {
  commit({ ...emptyData(), ...data });
}

export function getData() {
  load();
  return state;
}

/* ---------- helpers ---------- */

export function parseNum(v: string): Num {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function toDateStr(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${toDateStr(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Next due date: explicit reminder wins, otherwise last date + frequency. */
export function nextDue(m: Pick<Maintenance, "date" | "frequencyDays" | "reminder">): string | null {
  if (m.reminder) return m.reminder;
  if (m.frequencyDays && m.frequencyDays > 0) return addDays(m.date, m.frequencyDays);
  return null;
}

export function fmtDate(s: string) {
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(s: string) {
  const d = new Date(s);
  return d.toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PARAMS = [
  { key: "temp", label: "Temperatura", unit: "°C", color: "var(--chart-4)" },
  { key: "ph", label: "pH", unit: "", color: "var(--chart-1)" },
  { key: "gh", label: "GH", unit: "°d", color: "var(--chart-2)" },
  { key: "kh", label: "KH", unit: "°d", color: "var(--chart-3)" },
  { key: "no2", label: "NO2", unit: "mg/l", color: "var(--chart-5)" },
  { key: "no3", label: "NO3", unit: "mg/l", color: "var(--chart-6)" },
] as const;
export type ParamKey = (typeof PARAMS)[number]["key"];

/* ---------- CSV ---------- */

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], headers: string[]) {
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(";"))].join(
    "\n",
  );
}

export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Resize an image file to a JPEG data URL to save device storage. */
export function compressImage(file: File, max = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Immagine non leggibile."));
    img.src = url;
  });
}
