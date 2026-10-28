import { describe, expect, it } from "vitest";
import { nextDue, parseNum, toCsv } from "./store";

describe("manutenzioni", () => {
  it("il promemoria esplicito ha la precedenza sulla frequenza", () => {
    expect(nextDue({ date: "2026-01-01", frequencyDays: 7, reminder: "2026-01-03" })).toBe(
      "2026-01-03",
    );
  });
  it("senza promemoria usa data + frequenza", () => {
    expect(nextDue({ date: "2026-01-28", frequencyDays: 7, reminder: null })).toBe("2026-02-04");
  });
  it("senza frequenza né promemoria non c'è scadenza", () => {
    expect(nextDue({ date: "2026-01-01", frequencyDays: null, reminder: null })).toBeNull();
  });
});

describe("parametri", () => {
  it("un campo vuoto resta non misurato e la virgola è accettata", () => {
    expect(parseNum("")).toBeNull();
    expect(parseNum("6,8")).toBe(6.8);
  });
});

describe("csv", () => {
  it("valori vuoti e punti e virgola sono gestiti", () => {
    expect(toCsv([{ a: null, b: "x;y" }], ["a", "b"])).toBe('a;b\n;"x;y"');
  });
});
