import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Columns2, Pencil, Plus } from "lucide-react";
import { PageHeader, Empty } from "@/components/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Photo, compressImage, fmtDate, remove, toDateStr, uid, upsert, useData } from "@/lib/store";
import { safe } from "@/lib/safe";

export const Route = createFileRoute("/foto")({
  head: () => ({
    meta: [
      { title: "Foto · Acquario Diario" },
      { name: "description", content: "Diario fotografico e confronto dell'acquario nel tempo." },
      { property: "og:title", content: "Foto · Acquario Diario" },
      { property: "og:description", content: "Diario fotografico e confronto dell'acquario nel tempo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Foto,
});

function Foto() {
  const { photos } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [compare, setCompare] = useState(false);
  const sorted = [...photos].sort((a, b) => b.date.localeCompare(a.date));
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const pa = photos.find((p) => p.id === a) ?? sorted.at(-1);
  const pb = photos.find((p) => p.id === b) ?? sorted[0];

  return (
    <>
      <PageHeader
        title="Foto"
        subtitle="L'evoluzione della vasca"
        action={
          <div className="flex gap-2">
            {photos.length >= 2 && <Button variant="outline" onClick={() => setCompare(!compare)}><Columns2 /> {compare ? "Galleria" : "Confronta"}</Button>}
            <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Aggiungi</Button>
          </div>
        }
      />
      {photos.length === 0 ? <Empty>Nessuna foto. Aggiungi la prima per seguire la crescita della vasca.</Empty> : compare && pa && pb ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[[pa, setA] as const, [pb, setB] as const].map(([p, set], i) => (
            <div key={i} className="card-soft overflow-hidden">
              <select value={p.id} onChange={(e) => set(e.target.value)} className="w-full border-b bg-card p-2 text-sm">
                {sorted.map((x) => <option key={x.id} value={x.id}>{fmtDate(x.date)} · {x.caption || "senza didascalia"}</option>)}
              </select>
              <img src={p.dataUrl} alt={p.caption} className="aspect-[4/3] w-full object-cover" />
              <p className="p-3 text-sm">{p.caption}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {sorted.map((p) => (
            <figure key={p.id} className="card-soft overflow-hidden">
              <img src={p.dataUrl} alt={p.caption} className="aspect-square w-full object-cover" loading="lazy" />
              <figcaption className="flex items-start gap-1 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{fmtDate(p.date)}</p>
                  <p className="truncate text-sm">{p.caption}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Modifica" onClick={() => { setEditing(p); setOpen(true); }}><Pencil /></Button>
                <ConfirmDelete what="questa foto" onConfirm={() => safe(() => remove("photos", p.id), "Foto eliminata")} />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifica foto" : "Nuova foto"}</DialogTitle></DialogHeader>
          {open && <PhotoForm initial={editing} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhotoForm({ initial, onDone }: { initial: Photo | null; onDone: () => void }) {
  const [date, setDate] = useState(initial?.date ?? toDateStr(new Date()));
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [dataUrl, setDataUrl] = useState(initial?.dataUrl ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Il file non è un'immagine.");
    setBusy(true); setError("");
    try { setDataUrl(await compressImage(f)); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataUrl) return setError("Seleziona un'immagine.");
    if (!date) return setError("Indica la data.");
    if (safe(() => upsert("photos", { id: initial?.id ?? uid(), date, caption: caption.trim(), dataUrl }), initial ? "Foto aggiornata" : "Foto salvata")) onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="f">Immagine</Label><Input id="f" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} /></div>
      {dataUrl && <img src={dataUrl} alt="Anteprima" className="max-h-48 rounded-xl object-cover" />}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="pd">Data</Label><Input id="pd" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pc">Didascalia</Label><Input id="pc" value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Elaborazione…" : "Salva"}</Button></DialogFooter>
    </form>
  );
}
