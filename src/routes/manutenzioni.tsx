import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { PageHeader, Empty } from "@/components/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Maintenance, fmtDate, nextDue, parseNum, remove, toDateStr, uid, upsert, useData } from "@/lib/store";
import { safe } from "@/lib/safe";

export const Route = createFileRoute("/manutenzioni")({
  head: () => ({
    meta: [
      { title: "Manutenzioni · Acquario Diario" },
      { name: "description", content: "Registro manutenzioni con frequenza e promemoria." },
      { property: "og:title", content: "Manutenzioni · Acquario Diario" },
      { property: "og:description", content: "Registro manutenzioni con frequenza e promemoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Manutenzioni,
});

function Manutenzioni() {
  const { maintenance } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const today = toDateStr(new Date());
  const list = maintenance.map((m) => ({ ...m, due: nextDue(m) })).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  const markDone = (m: Maintenance) =>
    safe(() => upsert("maintenance", { ...m, date: today, reminder: null }), "Segnata come eseguita oggi");

  return (
    <>
      <PageHeader title="Manutenzioni" subtitle="Interventi periodici e promemoria" action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Nuova</Button>} />
      {list.length === 0 ? <Empty>Nessuna manutenzione registrata.</Empty> : (
        <ul className="space-y-3">
          {list.map((m) => {
            const overdue = m.due && m.due < today;
            return (
              <li key={m.id} className="card-soft flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Ultima: {fmtDate(m.date)}
                    {m.frequencyDays ? ` · ogni ${m.frequencyDays} giorni` : ""}
                  </p>
                </div>
                {m.due && (
                  <span className={`rounded-full px-3 py-1 text-xs ${overdue ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {overdue ? "Scaduta " : "Prossima "}{fmtDate(m.due)}
                  </span>
                )}
                <div className="flex">
                  {m.frequencyDays ? <Button variant="ghost" size="icon" aria-label="Eseguita oggi" title="Eseguita oggi" onClick={() => markDone(m)}><Check /></Button> : null}
                  <Button variant="ghost" size="icon" aria-label="Modifica" onClick={() => { setEditing(m); setOpen(true); }}><Pencil /></Button>
                  <ConfirmDelete what="questa manutenzione" onConfirm={() => safe(() => remove("maintenance", m.id), "Manutenzione eliminata")} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-xs text-muted-foreground">I promemoria compaiono in Dashboard e qui; non vengono inviate notifiche.</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifica manutenzione" : "Nuova manutenzione"}</DialogTitle></DialogHeader>
          {open && <MForm initial={editing} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MForm({ initial, onDone }: { initial: Maintenance | null; onDone: () => void }) {
  const [date, setDate] = useState(initial?.date ?? toDateStr(new Date()));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [freq, setFreq] = useState(initial?.frequencyDays?.toString() ?? "");
  const [reminder, setReminder] = useState(initial?.reminder ?? "");
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return setError("Indica la data.");
    if (!description.trim()) return setError("Inserisci una descrizione.");
    const f = parseNum(freq);
    if (Number.isNaN(f) || (f !== null && (f <= 0 || !Number.isInteger(f)))) return setError("La frequenza deve essere un numero intero di giorni.");
    const item: Maintenance = { id: initial?.id ?? uid(), date, description: description.trim(), frequencyDays: f, reminder: reminder || null };
    if (safe(() => upsert("maintenance", item), initial ? "Manutenzione aggiornata" : "Manutenzione salvata")) onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="desc">Descrizione</Label><Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. pulizia filtro" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="md">Data (ultima esecuzione)</Label><Input id="md" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="mf">Frequenza (giorni, facoltativa)</Label><Input id="mf" inputMode="numeric" value={freq} onChange={(e) => setFreq(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="mr">Promemoria (facoltativo)</Label><Input id="mr" type="date" value={reminder} onChange={(e) => setReminder(e.target.value)} /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="submit">Salva</Button></DialogFooter>
    </form>
  );
}
