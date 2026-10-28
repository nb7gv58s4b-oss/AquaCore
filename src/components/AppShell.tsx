import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Camera, FlaskConical, LayoutDashboard, NotebookPen, Settings, Wrench, Fish } from "lucide-react";
import { useData } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/parametri", label: "Parametri", icon: FlaskConical },
  { to: "/diario", label: "Diario", icon: NotebookPen },
  { to: "/manutenzioni", label: "Manutenzioni", icon: Wrench },
  { to: "/foto", label: "Foto", icon: Camera },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { settings } = useData();
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-60 md:flex-col md:gap-1 md:border-r md:bg-sidebar md:p-4 md:sticky md:top-0 md:h-screen">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="bg-leaf grid size-9 place-items-center rounded-xl text-primary-foreground">
            <Fish className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg leading-tight">Acquario Diario</p>
            {settings.tankName && (
              <p className="text-xs text-muted-foreground">{settings.tankName}</p>
            )}
          </div>
        </div>
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
        <p className="mt-auto px-2 text-xs text-muted-foreground">
          Modalità locale: i dati restano su questo dispositivo.
        </p>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:px-8 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-card/95 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-1 py-2 text-[10px] text-muted-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <Icon className="size-5" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="card-soft p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
