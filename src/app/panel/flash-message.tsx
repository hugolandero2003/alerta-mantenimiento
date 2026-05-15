"use client";

import { useEffect } from "react";
import { useState } from "react";

type FlashMessageProps = {
  message: string;
  type: "success" | "error";
};

export default function FlashMessage({ message, type }: FlashMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [message, type]);

  useEffect(() => {
    if (type !== "success") {
      return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.has("ok")) {
      url.searchParams.delete("ok");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [type, message]);

  if (!visible) {
    return null;
  }

  if (type === "success") {
    return (
      <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        {message}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
      {message}
    </section>
  );
}