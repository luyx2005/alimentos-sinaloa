import type { Metadata } from "next";

import { PitchDeck } from "@/app/pitch/pitch-deck";

export const metadata: Metadata = {
  title: "Pitch · Alimentos Sinaloa",
  description:
    "Deck de presentación: propósito, audiencia, visión, problema, solución, contexto, evidencias y llamado a la acción.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
