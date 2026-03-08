"use client";

import { useEffect, useState } from "react";
import { OrderTimeline } from "../../../_components/order-timeline";
import { useTrackingSSE } from "../../../_hooks/use-tracking-sse";
import type { TrackingEvent } from "../../../_lib/types";

interface TrackingLiveUpdatesProps {
  orderId: string;
  initialTimeline: TrackingEvent[];
  initialStatus: string;
  estimatedDelivery?: string;
}

export function TrackingLiveUpdates({
  orderId,
  initialTimeline,
  initialStatus,
  estimatedDelivery: initialEstimatedDelivery,
}: TrackingLiveUpdatesProps) {
  const { data: liveData } = useTrackingSSE(orderId);

  const timeline = liveData?.timeline ?? initialTimeline;
  const currentStatus = liveData?.status ?? initialStatus;
  const estimatedDelivery =
    liveData?.estimatedDelivery ?? initialEstimatedDelivery;

  return (
    <OrderTimeline
      events={timeline}
      estimatedDelivery={estimatedDelivery}
      currentStatus={currentStatus}
    />
  );
}
