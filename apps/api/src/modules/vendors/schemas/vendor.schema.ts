import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const VENDOR_PACKAGE_TIERS = [
  "starter",
  "growth",
  "scale",
] as const;

export type VendorPackageTier = (typeof VENDOR_PACKAGE_TIERS)[number];
export type VendorPackageStatus = "active" | "inactive";
export const VENDOR_VERIFICATION_STATUSES = [
  "not_started",
  "submitted",
  "verified",
  "rejected",
] as const;
export const VENDOR_VERIFICATION_DOCUMENT_TYPES = [
  "business_registration",
  "tax_document",
  "owner_id",
] as const;

export type VendorVerificationStatus =
  (typeof VENDOR_VERIFICATION_STATUSES)[number];
export type VendorVerificationDocumentType =
  (typeof VENDOR_VERIFICATION_DOCUMENT_TYPES)[number];

export interface BusinessInfo {
  legalName: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface VendorVerificationDocument {
  type: VendorVerificationDocumentType;
  url: string;
}

@Entity({ name: "vendors" })
@Index(["slug"], { unique: true })
@Index(["status"])
export class Vendor {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 120, unique: true })
  slug: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  logo?: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "pending",
  })
  status: "pending" | "approved" | "suspended";

  @Column({
    type: "varchar",
    length: 20,
    default: "not_started",
  })
  verificationStatus: VendorVerificationStatus;

  @Column({ type: "jsonb", nullable: true })
  businessInfo?: BusinessInfo;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  verificationDocuments: VendorVerificationDocument[];

  @Column({ type: "timestamptz", nullable: true })
  verificationSubmittedAt?: Date;

  @Column({ type: "timestamptz", nullable: true })
  verificationReviewedAt?: Date | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  verificationRejectionReason?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  stripeAccountId?: string;

  @Column({ type: "double precision", default: 0.12 })
  commissionRate: number;

  @Column({
    type: "varchar",
    length: 20,
    default: "starter",
  })
  packageTier: VendorPackageTier;

  @Column({ type: "int", default: 1999 })
  packagePriceInCents: number;

  @Column({
    type: "varchar",
    length: 20,
    default: "active",
  })
  packageStatus: VendorPackageStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeSlug() {
    if (this.slug) {
      this.slug = this.slug.toLowerCase().trim();
    }
  }
}

export type VendorDocument = Vendor;
