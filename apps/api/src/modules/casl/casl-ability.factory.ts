import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from "@casl/ability";
import { Injectable } from "@nestjs/common";
import { UserContext } from "../../common/interfaces";

// Define subject types as strings for flexibility
type Subjects =
  | "Product"
  | "Order"
  | "User"
  | "Vendor"
  | "Inventory"
  | "Shipment"
  | "all";

type Actions = "manage" | "create" | "read" | "update" | "delete";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: UserContext): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    // Platform Admin — full access to everything
    if (user.role === "platform_admin") {
      can("manage", "all");
      return build();
    }

    // Customer abilities
    if (user.role === "customer") {
      can("read", "Product");
      can("create", "Order");
      can("read", "Order", { customerId: user._id } as any);
      can("read", "Shipment", { customerId: user._id } as any);
      can("read", "User", { _id: user._id } as any);
      can("update", "User", { _id: user._id } as any);
    }

    // Vendor member abilities — derived from membership permissions
    if (user.vendorId && user.membership) {
      const perms = user.membership.permissions;

      // Product management
      if (perms.includes("manage_products")) {
        can("create", "Product");
        can("read", "Product", { vendorId: user.vendorId } as any);
        can("update", "Product", { vendorId: user.vendorId } as any);
        can("delete", "Product", { vendorId: user.vendorId } as any);
      }

      // Order management (read + update status, no delete)
      if (perms.includes("manage_orders")) {
        can("read", "Order", { vendorId: user.vendorId } as any);
        can("update", "Order", { vendorId: user.vendorId } as any);
      }

      // Inventory management
      if (perms.includes("manage_inventory")) {
        can("read", "Inventory", { vendorId: user.vendorId } as any);
        can("update", "Inventory", { vendorId: user.vendorId } as any);
      }

      // Vendor settings
      if (perms.includes("manage_settings")) {
        can("read", "Vendor", { _id: user.vendorId } as any);
        can("update", "Vendor", { _id: user.vendorId } as any);
      }

      // Fulfillment
      if (perms.includes("manage_orders")) {
        can("create", "Shipment");
        can("read", "Shipment", { vendorId: user.vendorId } as any);
        can("update", "Shipment", { vendorId: user.vendorId } as any);
      }

      // All vendor members can read their own products
      can("read", "Product", { vendorId: user.vendorId } as any);
    }

    return build();
  }
}
