import type { Metadata } from "next";
import { Deck } from "./deck";

export const metadata: Metadata = {
  title: "LP Arena — Sidetrack Deck",
  description:
    "LPing is a sport now. A 60-second walkthrough of the LP Agent sidetrack submission.",
};

export default function DeckPage() {
  return <Deck />;
}
