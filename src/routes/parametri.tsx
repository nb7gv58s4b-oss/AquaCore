import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil, Plus } from "lucide-react";
import { PageHeader, Empty } from "@/components/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PARAMS, type WaterTest, fmtDateTime, nowLocal, parseNum, remove, uid, upsert, useData } from "@/lib/store";
import { safe } from "@/lib/safe";

export const Route = createFileRoute("/parametri")({
  head: () => ({
    meta: [
      { title: "Parametri · Acquario Diario" },
      { name: "description", content: "Registro dei test dell'acqua e grafici dei parametri." },
      { property: "og:title", content: "Parametri · Acquario Diario" },
      { property: "og:description", content: "Registro dei test dell'acqua e grafici dei parametri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Parametri,
});

const PERIODS = [
  { label: "7 g", days: 7 },
  { label: "30 g", days: 30 },
  { label: "90 g", days: 90 },
  { label: "1 anno", days: 365 },
  { label: "Tutto", days: 0 },
];

function Parametri() {
  const { tests } = useData();
  const [editing, setEditing] = useState<WaterTest | null>(null);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(30);
  const sorted = useMemo(() => [...tests].sort((a, b) => b.datetime.localeCompare(a.datetime)), [tests]);

  const chartData = useMemo(() => {
    const from = period ? Date.now() - period * 86400000 : 0;
    return [...tests]
      .filter((t) => new Date(t.datetime).getTime() >= from)
      .sort((a, b) => a.datetime.localeCompare(b.datetime))
      .map((t) => ({ ...t, label: new Date(t.datetime).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) }));
  }, [tests, period]);

  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <>
      <PageHeader title="Parametri" subtitle="Test dell'acqua e andamento nel tempo" action={<Button onClick={openNew}><Plus /> Nuovo test</Button>} />

      {tests.length === 0 ? (
        <Empty>Nessun test ancora. Premi “Nuovo test” per iniziare.</Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Button key={p.days} size="sm" variant={period === p.days ? "default" : "outline"} className="rounded-full" onClick={() => setPeriod(p.days)}>
                {p.label}
              </Button>
            ))}
          </div>
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            {PARAMS.map((p) => {
              const pts = chartData.filter((d) => d[p.key] !== null);
              return (
                <div key={p.key} className="card-soft p-4">
                  <p className="mb-2 text-sm font-medium">{p.label} {p.unit && <span className="text-muted-foreground">({p.unit})</span>}</p>
                  {pts.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground">Nessuna misura nel periodo</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={pts} margin={{ left: -20, right: 8, top: 8 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                        <YAxis fontSize={11} stroke="var(--muted-foreground)" domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                        <Line type="monotone" dataKey={p.key} name={p.label} stroke={p.color} strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              );
            })}
          </div>

          <h2 className="mb-3 text-xl">Registro test</h2>
          <div className="card-soft overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3">Data</th>
                  {PARAMS.map((p) => <th key={p.key} className="p-3">{p.label === "Temperatura" ? "T °C" : p.label}</th>)}
                  <th className="p-3">Note</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-3">{fmtDateTime(t.datetime)}</td>
                    {PARAMS.map((p) => <td key={p.key} className="p-3">{t[p.key] ?? "—"}</td>)}
                    <td className="max-w-48 truncate p-3 text-muted-foreground">{t.note}</td>
                    <td className="whitespace-nowrap p-1">
                      <Button variant="ghost" size="icon" aria-label="Modifica" onClick={() => { setEditing(t); setOpen(true); }}><Pencil /></Button>
                      <ConfirmDelete what="questo test" onConfirm={() => safe(() => remove("tests", t.id), "Test eliminato")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <TestDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}

function TestDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial: WaterTest | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Modifica test" : "Nuovo test"}</DialogTitle></DialogHeader>
        {open && <TestForm initial={initial} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function TestForm({ initial, onDone }: { initial: WaterTest | null; onDone: () => void }) {
  const [datetime, setDatetime] = useState(initial?.datetime ?? nowLocal());
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(PARAMS.map((p) => [p.key, initial?.[p.key]?.toString() ?? ""])),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!datetime) return setError("Indica data e ora.");
    const parsed: Record<string, number | null> = {};
    for (const p of PARAMS) {
      const n = parseNum(vals[p.key] ?? "");
      if (Number.isNaN(n)) return setError(`Valore non valido per ${p.label}.`);
      parsed[p.key] = n;
    }
    if (Object.values(parsed).every((v) => v === null) && !note.trim())
      return setError("Inserisci almeno un valore o una nota.");
    const item = { id: initial?.id ?? uid(), datetime, note: note.trim(), ...parsed } as WaterTest;
    if (safe(() => upsert("tests", item), initial ? "Test aggiornato" : "Test salvato")) onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="dt">Data e ora</Label>
        <Input id="dt" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PARAMS.map((p) => (
          <div key={p.key} className="space-y-1.5">
            <Label htmlFor={p.key}>{p.label} {p.unit && <span className="text-muted-foreground">({p.unit})</span>}</Label>
            <Input id={p.key} inputMode="decimal" placeholder="non misurato" value={vals[p.key]} onChange={(e) => setVals({ ...vals, [p.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="submit">Salva</Button></DialogFooter>
    </form>
  );
}
