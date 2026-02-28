import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Vendor } from "../../vendors/schemas/vendor.schema";

export interface ProductVariant {
  sku: string;
  label: string;
  priceInCents: number;
  compareAtPriceInCents?: number;
  images: string[];
}

export interface ProductRating {
  avg: number;
  count: number;
}

@Entity({ name: "products" })
@Index(["vendorId", "status"])
@Index(["slug"], { unique: true })
@Index(["category", "status"])
export class Product {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "uuid" })
  vendorId: string;

  @ManyToOne(() => Vendor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vendorId" })
  vendor?: Vendor;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "text", array: true, default: () => "ARRAY[]::text[]" })
  category: string[];

  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  attributes: Record<string, string>;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  variants: ProductVariant[];

  @Column({
    type: "varchar",
    length: 20,
    default: "draft",
  })
  status: "draft" | "published" | "archived";

  @Column({
    type: "jsonb",
    default: () => "'{\"avg\":0,\"count\":0}'::jsonb",
  })
  rating: ProductRating;

  @Column({ type: "text", array: true, default: () => "ARRAY[]::text[]" })
  tags: string[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export type ProductDocument = Product;
