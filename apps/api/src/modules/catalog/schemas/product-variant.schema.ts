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
import { Product } from "./product.schema";

@Entity({ name: "product_variants" })
@Index(["productId"])
@Index(["sku"], { unique: true })
export class ProductVariant {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "productId" })
  product: Product;

  @Column({ type: "varchar", length: 150 })
  sku: string;

  @Column({ type: "varchar", length: 150 })
  label: string;

  @Column({ type: "int" })
  priceInCents: number;

  @Column({ type: "int", nullable: true })
  compareAtPriceInCents?: number;

  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  attributes: Record<string, string>;

  @Column({
    type: "varchar",
    length: 20,
    default: "active",
  })
  status: "active" | "inactive";

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export type ProductVariantDocument = ProductVariant;
