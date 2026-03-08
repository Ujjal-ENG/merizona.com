"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../_components/ui/button";
import { ORDER_STATUS_LABELS } from "../../../_lib/constants";
import type { OrderStatus } from "../../../_lib/types";

const NEXT_STATUS_OPTIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

interface OrderStatusUpdaterProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function OrderStatusUpdater({
  orderId,
  currentStatus,
}: OrderStatusUpdaterProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nextStatuses = useMemo(
    () => NEXT_STATUS_OPTIONS[currentStatus] ?? [],
    [currentStatus],
  );

  if (nextStatuses.length === 0) {
    return <span className="text-xs text-muted-foreground">No actions</span>;
  }

  const handleUpdate = () => {
    if (!selectedStatus) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/vendor/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selectedStatus }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string; message?: string | string[] }
            | null;

          const message =
            Array.isArray(payload?.message)
              ? payload?.message.join(", ")
              : payload?.message ?? payload?.error ?? "Failed to update order status";

          throw new Error(message);
        }

        setSelectedStatus("");
        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Failed to update order status",
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={selectedStatus}
          onChange={(event) =>
            setSelectedStatus(event.target.value as OrderStatus)
          }
          disabled={isPending}
        >
          <option value="">Select status</option>
          {nextStatuses.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleUpdate}
          disabled={!selectedStatus || isPending}
        >
          {isPending ? "Updating..." : "Update"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
