import { getVendorInventory } from "../../../_services/vendor.service";
import { Badge } from "../../../_components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../_components/ui/table";
import { InventoryStockEditor } from "./inventory-stock-editor";

export const dynamic = "force-dynamic";

export default async function VendorInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const { data: items, total } = await getVendorInventory(page, 20).catch(
    () => ({ data: [], total: 0, page: 1, limit: 20 }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground text-sm">
          {total} SKUs · manage stock levels
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>On Hand</TableHead>
              <TableHead>Reserved</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Low Stock</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const available = item.quantityOnHand - item.quantityReserved;
                const isLow = available <= item.lowStockThreshold;

                return (
                  <TableRow key={item._id}>
                    <TableCell className="font-mono text-sm">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.quantityReserved}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${
                          isLow ? "text-amber-600" : ""
                        }`}
                      >
                        {available}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive">Low</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {item.lowStockThreshold}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.warehouseLocation ?? "—"}
                    </TableCell>
                    <TableCell>
                      <InventoryStockEditor item={item} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
