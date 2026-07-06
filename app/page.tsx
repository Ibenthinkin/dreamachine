"use client";

import { useSyncExternalStore } from "react";
import ConsentGate from "@/components/ConsentGate";
import DreamachineScreen from "@/components/DreamachineScreen";
import { consentStore } from "@/lib/consent";

export default function Home() {
  // Gate is the default (server snapshot = false); DreamachineScreen can never
  // render without a valid consent record in localStorage (SPEC §8).
  const consented = useSyncExternalStore(
    consentStore.subscribe,
    consentStore.getSnapshot,
    consentStore.getServerSnapshot,
  );

  if (!consented) {
    return <ConsentGate onAccept={consentStore.accept} />;
  }

  return <DreamachineScreen />;
}
