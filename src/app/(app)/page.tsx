import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  Settings,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { formatLongDate, parseISODate, todayISO, addDaysISO } from "@/lib/dates";
import { hospitalStatusesForDate } from "@/lib/data";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  {
    href: "/captura",
    title: "Nueva captura",
    description: "Registrar las comidas servidas de un hospital.",
    icon: ClipboardList,
    adminOnly: false,
  },
  {
    href: "/no-completados",
    title: "Ver no completados",
    description: "Hospitales sin captura completa por fecha.",
    icon: CircleAlert,
    adminOnly: false,
  },
  {
    href: "/reportes",
    title: "Reportes",
    description: "Por hospital, por empresa y exportación a Excel.",
    icon: BarChart3,
    adminOnly: true,
  },
  {
    href: "/configuracion",
    title: "Configuración",
    description: "Empresas, hospitales, precios y usuarios.",
    icon: Settings,
    adminOnly: true,
  },
] as const;

export default async function HomePage() {
  const session = await requireSession();
  const isAdmin = session.role === "admin";
  const quickActions = QUICK_ACTIONS.filter((action) => isAdmin || !action.adminOnly);
  const lastDay = addDaysISO(todayISO(), -1);
  const statuses = await hospitalStatusesForDate({ serviceDate: lastDay });
  const incomplete = statuses.filter((item) => item.status !== "completo");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {session.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Captura las cantidades servidas y consulta los reportes de cada empresa."
            : "Captura las cantidades servidas de cada hospital y revisa qué falta por registrar."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
              <CardHeader>
                <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </div>
                <CardTitle className="flex items-center gap-1 text-base">
                  {title}
                  <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-muted-foreground" />
            No completados del último día
          </CardTitle>
          <CardDescription className="capitalize">
            {formatLongDate(parseISODate(lastDay))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Todavía no hay hospitales activos. Agrégalos desde Configuración."
                : "Todavía no hay hospitales activos. Pide a un administrador que los dé de alta."}
            </p>
          ) : incomplete.length === 0 ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Todos los hospitales tienen su captura completa de ese día.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {incomplete.length} de {statuses.length} hospitales sin captura completa.
              </p>
              <ul className="divide-y rounded-lg border">
                {incomplete.slice(0, 5).map((item) => (
                  <li
                    key={item.hospital.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{item.hospital.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {item.hospital.companyName}
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
              <div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/no-completados?fecha=${lastDay}`}>
                    Ver todos los no completados
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
