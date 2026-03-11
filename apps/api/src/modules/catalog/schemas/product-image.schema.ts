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
import { ProductVariant } from "./product-variant.schema";
import { Product } from "./product.schema";

@Entity({ name: "product_images" })
@Index(["productId"])
@Index(["variantId"])
export class ProductImage {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "productId" })
  product: Product;

  @Column({ type: "uuid", nullable: true })
  variantId?: string;

  @ManyToOne(() => ProductVariant, {
    onDelete: "SET NULL", // Image might belong to product, but variant could be deleted
  })
  @JoinColumn({ name: "variantId" })
  variant?: ProductVariant;

  @Column({ type: "varchar", length: 150 })
  fileName: string;

  @Column({ type: "text" })
  url: string;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export type ProductImageDocument = ProductImage;
