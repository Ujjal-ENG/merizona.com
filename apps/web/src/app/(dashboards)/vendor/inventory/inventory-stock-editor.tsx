"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "../../../_components/ui/button";
import { Input } from "../../../_components/ui/input";
import { updateStock } from "../../../_services/vendor.service";
import type { InventoryItem } from "../../../_lib/types";

export function InventoryStockEditor({ item }: { item: InventoryItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.quantityOnHand));
  const [loading, setLoading] = useState(false);

  async function save() {
    const qty = Number(value);
    if (isNaN(qty) || qty < 0) return;
    setLoading(true);
    try {
      await updateStock(item.sku, { quantityOnHand: qty });
      setEditing(false);
      router.refresh();
    } catch {
      // show toast in production
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-20 text-sm"
        min={0}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={save}
        disabled={loading}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => {
          setEditing(false);
          setValue(String(item.quantityOnHand));
        }}
        disabled={loading}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
