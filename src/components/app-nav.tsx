"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CircleAlert,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Settings,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Inicio", icon: Home, adminOnly: false },
  { href: "/captura", label: "Captura", icon: ClipboardList, adminOnly: false },
  { href: "/no-completados", label: "No completados", icon: CircleAlert, adminOnly: false },
  { href: "/reportes", label: "Reportes", icon: BarChart3, adminOnly: true },
  { href: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav({
  userName,
  roleLabel,
  isAdmin,
  logout,
}: {
  userName: string;
  roleLabel: string;
  isAdmin: boolean;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((link) => isAdmin || !link.adminOnly);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-4" />
          </span>
          <span className="hidden sm:inline">Alimentos Sinaloa</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-right text-sm leading-tight sm:block">
            <span className="block">{userName}</span>
            <span className="block text-xs text-muted-foreground">{roleLabel}</span>
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" title="Cerrar sesión">
              <LogOut className="size-4" />
              <span className="sr-only sm:not-sr-only">Salir</span>
            </Button>
          </form>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="flex flex-col gap-1 border-t px-4 py-2 md:hidden">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                isActive(pathname, href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
