import { CheckCircle, Circle, Truck, Package, MapPin } from "lucide-react";
import { cn, formatDateTime } from "../_lib/utils";
import { TRACKING_STATUS_LABELS } from "../_lib/constants";
import type { TrackingEvent, TrackingStatus } from "../_lib/types";

const STATUS_ORDER: TrackingStatus[] = [
  "label_created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

function StatusIcon({ status, isCompleted, isCurrent }: {
  status: TrackingStatus;
  isCompleted: boolean;
  isCurrent: boolean;
}) {
  if (isCompleted) {
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  }
  if (isCurrent) {
    if (status === "in_transit" || status === "out_for_delivery") {
      return <Truck className="h-5 w-5 text-blue-500 animate-pulse" />;
    }
    if (status === "picked_up") {
      return <Package className="h-5 w-5 text-blue-500" />;
    }
    return <MapPin className="h-5 w-5 text-blue-500" />;
  }
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

interface OrderTimelineProps {
  events: TrackingEvent[];
  estimatedDelivery?: string;
  currentStatus?: string;
}

export function OrderTimeline({
  events,
  estimatedDelivery,
  currentStatus,
}: OrderTimelineProps) {
  const completedStatuses = new Set(events.map((e) => e.status));
  const lastStatus = events[events.length - 1]?.status ?? "label_created";

  // Find the last event for each status (de-dup for the stepper)
  const eventsByStatus = new Map<string, TrackingEvent>();
  for (const event of events) {
    eventsByStatus.set(event.status, event);
  }

  return (
    <div className="space-y-4">
      {estimatedDelivery && currentStatus !== "delivered" && (
        <div className="rounded-lg border bg-blue-50 p-3 text-sm text-blue-700">
          Estimated delivery: <strong>{formatDateTime(estimatedDelivery)}</strong>
        </div>
      )}

      {/* Stepper */}
      <div className="relative">
        {STATUS_ORDER.map((status, idx) => {
          const isCompleted =
            completedStatuses.has(status) && status !== lastStatus;
          const isCurrent = status === lastStatus;
          const isPending = !completedStatuses.has(status) && !isCurrent;
          const event = eventsByStatus.get(status);

          return (
            <div key={status} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Connector line */}
              {idx < STATUS_ORDER.length - 1 && (
                <div
                  className={cn(
                    "absolute left-2.5 top-5 w-[2px] h-full -translate-x-1/2",
                    isCompleted ? "bg-green-300" : "bg-muted",
                  )}
                />
              )}

              <div className="relative z-10 shrink-0 mt-0.5">
                <StatusIcon
                  status={status}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-medium text-sm",
                    isPending && "text-muted-foreground",
                    isCurrent && "text-blue-700",
                    isCompleted && "text-foreground",
                  )}
                >
                  {TRACKING_STATUS_LABELS[status] ?? status}
                </p>
                {event && (
                  <>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.location} · {formatDateTime(event.timestamp)}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw timeline events */}
      {events.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Show all tracking events ({events.length})
          </summary>
          <div className="mt-3 space-y-2 pl-4 border-l-2">
            {[...events].reverse().map((event, idx) => (
              <div key={idx}>
                <p className="font-medium">
                  {TRACKING_STATUS_LABELS[event.status] ?? event.status}
                </p>
                <p className="text-muted-foreground text-xs">
                  {event.description}
                </p>
                <p className="text-muted-foreground text-xs">
                  {event.location} · {formatDateTime(event.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
