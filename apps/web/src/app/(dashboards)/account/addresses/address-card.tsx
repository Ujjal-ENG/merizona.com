import { MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../_components/ui/card";
import { Badge } from "../../../_components/ui/badge";
import type { Address } from "../../../_lib/types";

export function AddressCard({ address }: { address: Address }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {address.label}
          </CardTitle>
          {address.isDefault && (
            <Badge variant="secondary" className="text-xs">
              Default
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-0.5">
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}, {address.state} {address.zip}
        </p>
        <p>{address.country}</p>
      </CardContent>
    </Card>
  );
}
