"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  Hospital,
  Printer,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";

const SLIDES = [
  "portada",
  "proposito",
  "audiencia",
  "vision",
  "problema",
  "solucion",
  "contexto",
  "evidencias",
  "cta",
] as const;

export function PitchDeck() {
  const [index, setIndex] = useState(0);

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        go(index + 1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(index - 1);
      }
      if (event.key === "Home") go(0);
      if (event.key === "End") go(SLIDES.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  return (
    <div className="pitch-root flex min-h-dvh flex-col bg-[#0f1c17] text-[#f4efe4]">
      <header className="flex items-center justify-between gap-3 px-4 py-3 print:hidden">
        <p className="text-xs tracking-[0.2em] text-[#c4b89a] uppercase">
          Alimentos Sinaloa · Pitch
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#c4b89a] hover:bg-white/5"
          >
            <Printer className="size-3.5" />
            Imprimir / PDF
          </button>
          <span className="text-xs tabular-nums text-[#c4b89a]">
            {index + 1} / {SLIDES.length}
          </span>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-3 pb-16 print:block print:px-0 print:pb-0">
        <article
          onClick={() => go(index + 1)}
          className="relative flex aspect-video w-full max-w-6xl cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#16241e] shadow-[0_30px_80px_rgba(0,0,0,0.45)] print:hidden"
        >
          {index === 0 ? <Cover /> : null}
          {index === 1 ? <Purpose /> : null}
          {index === 2 ? <Audience /> : null}
          {index === 3 ? <Vision /> : null}
          {index === 4 ? <Problem /> : null}
          {index === 5 ? <Solution /> : null}
          {index === 6 ? <Context /> : null}
          {index === 7 ? <Evidence /> : null}
          {index === 8 ? <CallToAction /> : null}
        </article>

        <div className="hidden print:block">
          <Cover />
          <Purpose />
          <Audience />
          <Vision />
          <Problem />
          <Solution />
          <Context />
          <Evidence />
          <CallToAction />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-4 px-4 py-4 print:hidden">
        <button
          type="button"
          aria-label="Diapositiva anterior"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="rounded-full border border-white/15 p-2 disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        <ol className="flex gap-1.5">
          {SLIDES.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                aria-label={`Ir a ${id}`}
                onClick={() => go(i)}
                className={`block size-2 rounded-full ${
                  i === index ? "bg-[#e2c56a]" : "bg-white/25"
                }`}
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          aria-label="Siguiente diapositiva"
          disabled={index === SLIDES.length - 1}
          onClick={() => go(index + 1)}
          className="rounded-full border border-white/15 p-2 disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </nav>
    </div>
  );
}

function Frame({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="pitch-page flex h-full w-full flex-col justify-between p-10 md:p-14">
      <p className="text-xs tracking-[0.28em] text-[#e2c56a] uppercase">{kicker}</p>
      <div className="mt-4 flex-1">
        <h2 className="max-w-4xl font-semibold tracking-tight text-balance text-3xl md:text-5xl">
          {title}
        </h2>
        <div className="mt-8">{children}</div>
      </div>
      <p className="text-[11px] tracking-wide text-[#8f8674]">Alimentos Sinaloa</p>
    </div>
  );
}

function Cover() {
  return (
    <div className="pitch-page relative flex h-full w-full flex-col justify-between overflow-hidden p-10 md:p-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-[#2f5a3c]/40 blur-3xl"
      />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-[#e2c56a] text-[#16241e]">
          <UtensilsCrossed className="size-5" />
        </span>
        <span className="text-sm tracking-[0.2em] text-[#c4b89a] uppercase">
          Pitch deck
        </span>
      </div>
      <div>
        <p className="text-sm text-[#e2c56a]">Comedores hospitalarios</p>
        <h1 className="mt-3 max-w-3xl font-semibold tracking-tight text-5xl md:text-7xl">
          Alimentos Sinaloa
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[#d8d0c0]">
          De la charola al cobro: cada ración servida queda registrada, calculada y
          respaldada con foto.
        </p>
      </div>
      <p className="text-sm text-[#8f8674]">9 diapositivas · flechas o clic para avanzar</p>
    </div>
  );
}

function Purpose() {
  return (
    <Frame
      kicker="El propósito"
      title="Que el cobro de cada hospital se arme con lo que realmente se sirvió ese día."
    >
      <p className="max-w-3xl text-lg leading-relaxed text-[#d8d0c0]">
        La herramienta existe para que un capturista registre, por hospital y fecha,
        desayunos, comidas y cenas —pacientes, personal y colación— y el sistema convierta
        esas cantidades en importes, reportes y evidencia, sin rehacer el Excel cada
        semana o quincena.
      </p>
    </Frame>
  );
}

function Audience() {
  return (
    <Frame kicker="A quién va dirigido" title="Quien opera el comedor y quien cierra el periodo.">
      <ul className="grid gap-4 md:grid-cols-3">
        <AudienceCard
          icon={<Building2 className="size-5" />}
          title="Empresas de alimentos"
          body="Quienes abastecen hospitales con precio propio y periodo de pago semanal o quincenal."
        />
        <AudienceCard
          icon={<ClipboardList className="size-5" />}
          title="Capturistas"
          body="Quienes están en el hospital y necesitan anotar el día en minutos, desde una tablet."
        />
        <AudienceCard
          icon={<Hospital className="size-5" />}
          title="Administración"
          body="Quienes revisan lo no completado, sacan el reporte y lo entregan en Excel o PDF."
        />
      </ul>
    </Frame>
  );
}

function AudienceCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="text-[#e2c56a]">{icon}</div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#c4b89a]">{body}</p>
    </li>
  );
}

function Vision() {
  return (
    <Frame
      kicker="La visión"
      title="Un solo registro diario por hospital, imposible de perder y fácil de cobrar."
    >
      <p className="max-w-3xl text-lg leading-relaxed text-[#d8d0c0]">
        Que ninguna ración quede en una hoja suelta. Que un cambio de precio no reescriba
        el pasado. Que al cerrar la semana o la quincena el reporte ya esté, con foto del
        reporte firmado, y que se pueda crecer a más empresas y más estados sin cambiar de
        herramienta.
      </p>
    </Frame>
  );
}

function Problem() {
  return (
    <Frame
      kicker="El problema"
      title="El dato del día se captura, se copia y se pierde entre archivos."
    >
      <ul className="grid gap-3 text-[#d8d0c0] md:grid-cols-2">
        {[
          "Cada hospital cierra el día en papel, WhatsApp o un Excel distinto.",
          "Nadie ve de un vistazo qué hospital no terminó la captura.",
          "Un precio nuevo corre el riesgo de recalcular importes ya cobrados.",
          "Semana y quincena se arman a mano, hospital por hospital.",
          "Pacientes, personal y colación se mezclan o se omiten.",
          "Sin foto del reporte firmado, el número no tiene respaldo.",
        ].map((item) => (
          <li
            key={item}
            className="rounded-lg border border-white/10 px-4 py-3 text-sm leading-relaxed"
          >
            {item}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function Solution() {
  return (
    <Frame
      kicker="La solución"
      title="Una captura del día. El importe y el reporte salen solos."
    >
      <ul className="grid gap-4 md:grid-cols-2">
        <SolutionItem
          icon={<ClipboardList className="size-4" />}
          title="Captura por servicio"
          body="Desayuno, comida y cena, cada uno con pacientes, personal, colación y foto opcional."
        />
        <SolutionItem
          icon={<Camera className="size-4" />}
          title="Reporte diario firmado"
          body="La foto del reporte es obligatoria al guardar. Queda ligada a esa fecha y ese hospital."
        />
        <SolutionItem
          icon={<ShieldCheck className="size-4" />}
          title="Precio congelado"
          body="Al guardar se copia el precio vigente. Si mañana cambia, el histórico no se mueve."
        />
        <SolutionItem
          icon={<FileSpreadsheet className="size-4" />}
          title="Reportes listos para cobrar"
          body="Por hospital, empresa, pacientes vs personal y servicio. Excel y PDF en un clic."
        />
      </ul>
    </Frame>
  );
}

function SolutionItem({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 text-[#e2c56a]">{icon}</span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[#c4b89a]">{body}</p>
      </div>
    </li>
  );
}

function Context() {
  return (
    <Frame
      kicker="El contexto"
      title="Operación real, no un prototipo de comedor genérico."
    >
      <div className="grid gap-6 text-[#d8d0c0] md:grid-cols-2">
        <p className="text-base leading-relaxed">
          Alimentos Sinaloa nace de la operación de comedores en hospitales: dos empresas
          con reglas distintas de cobro, hospitales con precio propio, y un capturista que
          tiene que dejar el día cerrado antes de irse.
        </p>
        <ul className="space-y-2 text-sm">
          <li>WWPL cobra por semana (lunes a domingo).</li>
          <li>PERLOT cobra por quincena (1–15 y 16 al último día).</li>
          <li>El precio es por hospital, en pesos, y aplica a todo lo servido.</li>
          <li>El capturista no ve reportes ni configuración: solo captura.</li>
          <li>Se opera desde escritorio o tablet, en español.</li>
        </ul>
      </div>
    </Frame>
  );
}

function Evidence() {
  return (
    <Frame
      kicker="Las evidencias"
      title="Ya está en uso, con el flujo completo, no solo la pantalla bonita."
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat value="2" label="Empresas activas" />
        <Stat value="10" label="Hospitales" />
        <Stat value="195" label="Capturas del día" />
        <Stat value="44" label="Pruebas del flujo" />
      </div>
      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-[#c4b89a]">
        Login con roles, captura con foto, hospitales no completados, reportes por rango
        libre o por periodo de la empresa, y exportación a Excel y PDF. Lo que se ve en
        la demostración es lo que ya corre, no una maqueta.
      </p>
    </Frame>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <p className="font-semibold text-3xl text-[#e2c56a] tabular-nums">{value}</p>
      <p className="mt-1 text-xs tracking-wide text-[#c4b89a] uppercase">{label}</p>
    </div>
  );
}

function CallToAction() {
  return (
    <Frame kicker="Call to action" title="El siguiente cierre, con esta herramienta.">
      <ol className="max-w-2xl space-y-4 text-lg text-[#d8d0c0]">
        <li>
          <span className="text-[#e2c56a]">1.</span> Entren a una demo de diez minutos:
          capturen un hospital y bajen el Excel del periodo.
        </li>
        <li>
          <span className="text-[#e2c56a]">2.</span> Dejen de paralelizar el Excel: el
          siguiente periodo de WWPL o PERLOT se cierra aquí.
        </li>
        <li>
          <span className="text-[#e2c56a]">3.</span> Si el piloto cubre el cobro, se
          suman el resto de hospitales sin cambiar de sistema.
        </li>
      </ol>
      <p className="mt-10 text-sm text-[#c4b89a]">
        App: captura diaria · Reportes: solo administradores · Demo: pidan acceso
      </p>
    </Frame>
  );
}
