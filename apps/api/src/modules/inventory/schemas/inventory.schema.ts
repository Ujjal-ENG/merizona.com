import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Product } from "../../catalog/schemas/product.schema";
import { Vendor } from "../../vendors/schemas/vendor.schema";

@Entity({ name: "inventory" })
@Index(["sku"], { unique: true })
@Index(["productId"])
@Index(["vendorId"])
@Index(["quantityOnHand", "lowStockThreshold"])
@Check(`"quantityOnHand" >= 0`)
@Check(`"quantityReserved" >= 0`)
export class Inventory {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product?: Product;

  @Column({ type: "uuid" })
  vendorId: string;

  @ManyToOne(() => Vendor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vendorId" })
  vendor?: Vendor;

  @Column({ type: "varchar", length: 100, unique: true })
  sku: string;

  @Column({ type: "int", default: 0 })
  quantityOnHand: number;

  @Column({ type: "int", default: 0 })
  quantityReserved: number;

  @Column({ type: "int", default: 10 })
  lowStockThreshold: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  warehouseLocation?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export type InventoryDocument = Inventory;
