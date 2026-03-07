"use client";

import { useEffect, useRef, useState } from "react";
import type { TrackingEvent } from "../_lib/types";

interface TrackingUpdate {
  status: string;
  timeline: TrackingEvent[];
  estimatedDelivery?: string;
}

export function useTrackingSSE(orderId: string) {
  const [data, setData] = useState<TrackingUpdate | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

    const es = new EventSource(`${apiBase}/tracking/${orderId}/stream`, {
      withCredentials: true,
    });

    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as TrackingUpdate;
        setData(payload);
      } catch {
        // ignore malformed messages
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError("Connection lost. Updates will resume automatically.");
      // Browser will automatically retry SSE connections
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [orderId]);

  return { data, connected, error };
}
