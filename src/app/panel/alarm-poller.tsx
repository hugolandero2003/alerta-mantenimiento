"use client";

import { useEffect } from "react";

export default function AlarmPoller() {
  useEffect(() => {
    let cancelled = false;

    const dispatchAlarms = async () => {
      try {
        await fetch("/api/alarms/process", {
          method: "GET",
          cache: "no-store",
        });
      } catch {
        if (!cancelled) {
          console.error("No fue posible revisar las alarmas programadas.");
        }
      }
    };

    void dispatchAlarms();
    const intervalId = window.setInterval(() => {
      void dispatchAlarms();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}