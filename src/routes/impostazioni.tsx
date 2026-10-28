import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AppData, PARAMS, download, getData, parseNum, replaceAll, saveSettings, toCsv, toDateStr, useData } from "@/lib/store";
import { safe } from "@/lib/safe";

export const Route = createFileRoute("/impostazioni")({
  head: () => ({
    meta: [
      { title: "Impostazioni · Acquario Diario" },
      { name: "description", content: "Dati della vasca, esportazione CSV e backup." },
      { property: "og:title", content: "Impostazioni · Acquario Diario" },
      { property: "og:description", content: "Dati della vasca, esportazione CSV e backup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Impostazioni,
});

function Impostazioni() {
  const data = useData();
  const [name, setName] = useState("");
  const [liters, setLiters] = useState("");
  useEffect(() => {
    setName(data.settings.tankName);
    setLiters(data.settings.liters?.toString() ?? "");
  }, [data.settings]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseNum(liters);
    if (Number.isNaN(l) || (l !== null && l <= 0)) return toast.error("Litri non validi.");
    safe(() => saveSettings({ tankName: name.trim(), liters: l }), "Impostazioni salvate");
  };

  const d = toDateStr(new Date());
  const exportCsv = (kind: "tests" | "journal" | "maintenance") => {
    const map = {
      tests: { rows: data.tests, h: ["datetime", ...PARAMS.map((p) => p.key), "note"] },
      journal: { rows: data.journal, h: ["date", "type", "text"] },
      maintenance: { rows: data.maintenance, h: ["date", "description", "frequencyDays", "reminder"] },
    }[kind];
    if (map.rows.length === 0) return toast.error("Nessun dato da esportare.");
    download(`acquario-${kind}-${d}.csv`, toCsv(map.rows as unknown as Record<string, unknown>[], map.h));
  };

  const backup = () => download(`acquario-backup-${d}.json`, JSON.stringify(getData()), "application/json");

  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as AppData;
      if (!Array.isArray(parsed.tests) || !Array.isArray(parsed.journal)) throw new Error();
      if (!confirm("Il ripristino sostituirà tutti i dati attuali. Continuare?")) return;
      safe(() => replaceAll(parsed), "Backup ripristinato");
    } catch {
      toast.error("File di backup non valido.");
    }
  };

  return (
    <>
      <PageHeader title="Impostazioni" />
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={save} className="card-soft space-y-4 p-5">
          <h2 className="text-xl">La vasca</h2>
          <div className="space-y-1.5"><Label htmlFor="n">Nome</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Vasca soggiorno" /></div>
          <div className="space-y-1.5"><Label htmlFor="l">Litri</Label><Input id="l" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} /></div>
          <Button type="submit">Salva</Button>
        </form>

        <section className="card-soft space-y-4 p-5">
          <h2 className="text-xl">Esporta e backup</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportCsv("tests")}><Download /> Test CSV</Button>
            <Button variant="outline" onClick={() => exportCsv("journal")}><Download /> Diario CSV</Button>
            <Button variant="outline" onClick={() => exportCsv("maintenance")}><Download /> Manutenzioni CSV</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backup}><Download /> Backup completo (JSON)</Button>
            <Button variant="secondary" asChild>
              <label className="cursor-pointer"><Upload /> Ripristina backup<input type="file" accept="application/json" className="hidden" onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} /></label>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Il backup include anche le foto.</p>
        </section>

        <section className="card-soft space-y-2 p-5 lg:col-span-2">
          <h2 className="text-xl">Dove sono i tuoi dati</h2>
          <p className="text-sm text-muted-foreground">
            L'app funziona in modalità locale: test, diario, manutenzioni e foto sono salvati solo nel browser di questo dispositivo.
            Non vengono sincronizzati con altri dispositivi e vanno persi se cancelli i dati del browser. Fai backup regolari.
          </p>
        </section>
      </div>
    </>
  );
}
