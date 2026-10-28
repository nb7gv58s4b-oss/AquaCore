import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { PARAMS, fmtDate, fmtDateTime, nextDue, toDateStr, useData } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Acquario Diario" },
      { name: "description", content: "Riepilogo di parametri, attività e manutenzioni del tuo acquario." },
      { property: "og:title", content: "Dashboard · Acquario Diario" },
      { property: "og:description", content: "Riepilogo di parametri, attività e manutenzioni del tuo acquario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tests, journal, maintenance, settings } = useData();
  const sorted = [...tests].sort((a, b) => b.datetime.localeCompare(a.datetime));
  const latest = PARAMS.map((p) => {
    const t = sorted.find((x) => x[p.key] !== null);
    return { ...p, value: t ? t[p.key] : null, when: t?.datetime };
  });
  const today = toDateStr(new Date());
  const upcoming = maintenance
    .map((m) => ({ ...m, due: nextDue(m) }))
    .filter((m) => m.due)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, 5);
  const recent = [...journal].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <>
      <PageHeader
        title={settings.tankName || "Il tuo acquario"}
        subtitle={settings.liters ? `${settings.liters} litri · acqua dolce` : "Acqua dolce"}
        action={
          <Button asChild>
            <Link to="/parametri">Nuovo test</Link>
          </Button>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 text-xl">Valori più recenti</h2>
        {tests.length === 0 ? (
          <Empty>
            Nessun test registrato.{" "}
            <Link to="/parametri" className="text-primary underline">
              Registra il primo test
            </Link>
            .
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {latest.map((p) => (
              <div key={p.key} className="card-soft p-4">
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="mt-1 font-display text-2xl">
                  {p.value ?? "—"}
                  {p.value !== null && p.unit && (
                    <span className="ml-1 text-sm text-muted-foreground">{p.unit}</span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {p.when ? fmtDateTime(p.when) : "non misurato"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-soft p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Prossime manutenzioni</h2>
            <Link to="/manutenzioni" className="text-sm text-primary">Tutte</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna manutenzione programmata.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{m.description}</span>
                  <span className={m.due! < today ? "font-semibold text-destructive" : m.due === today ? "font-semibold text-warning" : "text-muted-foreground"}>
                    {m.due! < today ? "Scaduta · " : m.due === today ? "Oggi · " : ""}
                    {fmtDate(m.due!)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Ultime attività</h2>
            <Link to="/diario" className="text-sm text-primary">Diario</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna attività annotata.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((j) => (
                <li key={j.id} className="py-2 text-sm">
                  <span className="mr-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{j.type}</span>
                  <span className="text-muted-foreground">{fmtDate(j.date)}</span>
                  {j.text && <p className="mt-1 line-clamp-2">{j.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
