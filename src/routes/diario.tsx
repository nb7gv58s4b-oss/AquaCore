import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { PageHeader, Empty } from "@/components/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, type JournalEntry, fmtDate, remove, toDateStr, uid, upsert, useData } from "@/lib/store";
import { safe } from "@/lib/safe";

export const Route = createFileRoute("/diario")({
  head: () => ({
    meta: [
      { title: "Diario · Acquario Diario" },
      { name: "description", content: "Annota cambi d'acqua, potature, fertilizzazioni ed eventi della vasca." },
      { property: "og:title", content: "Diario · Acquario Diario" },
      { property: "og:description", content: "Annota cambi d'acqua, potature, fertilizzazioni ed eventi della vasca." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Diario,
});

function Diario() {
  const { journal } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [filter, setFilter] = useState("");
  const list = [...journal].filter((j) => !filter || j.type === filter).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader title="Diario" subtitle="Eventi e interventi sulla vasca" action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Nuova voce</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {["", ...EVENT_TYPES].map((t) => (
          <Button key={t} size="sm" className="rounded-full" variant={filter === t ? "default" : "outline"} onClick={() => setFilter(t)}>{t || "Tutti"}</Button>
        ))}
      </div>
      {list.length === 0 ? <Empty>Nessuna voce nel diario.</Empty> : (
        <ul className="space-y-3">
          {list.map((j) => (
            <li key={j.id} className="card-soft flex items-start gap-3 p-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{j.type}</span>
                  <span className="text-muted-foreground">{fmtDate(j.date)}</span>
                </div>
                {j.text && <p className="mt-2 whitespace-pre-wrap text-sm">{j.text}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label="Modifica" onClick={() => { setEditing(j); setOpen(true); }}><Pencil /></Button>
              <ConfirmDelete what="questa voce" onConfirm={() => safe(() => remove("journal", j.id), "Voce eliminata")} />
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifica voce" : "Nuova voce"}</DialogTitle></DialogHeader>
          {open && <EntryForm initial={editing} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EntryForm({ initial, onDone }: { initial: JournalEntry | null; onDone: () => void }) {
  const [date, setDate] = useState(initial?.date ?? toDateStr(new Date()));
  const [type, setType] = useState(initial?.type ?? EVENT_TYPES[0]);
  const [text, setText] = useState(initial?.text ?? "");
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return setError("Indica la data.");
    if (type === "Altro" && !text.trim()) return setError("Descrivi l'evento.");
    if (safe(() => upsert("journal", { id: initial?.id ?? uid(), date, type, text: text.trim() }), initial ? "Voce aggiornata" : "Voce salvata")) onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="d">Data</Label><Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="t">Tipo</Label>
          <select id="t" value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="x">Descrizione</Label><Textarea id="x" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Es. cambio 30%, aggiunte 3 Cryptocoryne…" /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="submit">Salva</Button></DialogFooter>
    </form>
  );
}
