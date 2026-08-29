import type { Metadata } from "next";

import { PitchDeck } from "@/app/pitch/pitch-deck";

export const metadata: Metadata = {
  title: "Pitch · Alimentos Sinaloa",
  description:
    "Deck de presentación: a quién va dirigido, el problema, la solución y el llamado a la acción.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
