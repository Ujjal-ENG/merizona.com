/**
 * Merizona — Database Seeder (TypeORM)
 *
 * Standalone script: no NestJS DI.
 * Run: pnpm --filter @merizona/api seed
 */

import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";
import "reflect-metadata";
import { DataSource, EntitySchema } from "typeorm";

// ─── Load .env from repo root ─────────────────────────────────────────────────

const envPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0 && !process.env[key]) {
      process.env[key] = rest.join("=").trim();
    }
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/merizona";
const DATABASE_SSL = process.env.DATABASE_SSL === "true";
const SALT_ROUNDS = 12;

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = "platform_admin" | "customer";
type UserStatus = "active" | "suspended" | "deleted";
type VendorStatus = "pending" | "approved" | "suspended";
type MembershipRole = "owner" | "manager" | "staff";
type ProductStatus = "draft" | "published" | "archived";

interface UserRow {
  _id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
  };
  addresses: Array<{
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
    isDefault: boolean;
  }>;
  status: UserStatus;
  refreshTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorRow {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: VendorStatus;
  businessInfo?: {
    legalName: string;
    taxId?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  stripeAccountId?: string;
  commissionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MembershipRow {
  _id: string;
  userId: string;
  vendorId: string;
  role: MembershipRole;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ProductVariant {
  sku: string;
  label: string;
  priceInCents: number;
  compareAtPriceInCents?: number;
  images: string[];
}

interface ProductRow {
  _id: string;
  vendorId: string;
  title: string;
  slug: string;
  description: string;
  category: string[];
  attributes: Record<string, string>;
  variants: ProductVariant[];
  status: ProductStatus;
  rating: { avg: number; count: number };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryRow {
  _id: string;
  productId: string;
  vendorId: string;
  sku: string;
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold: number;
  warehouseLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderRow {
  _id: string;
  orderNumber: string;
  customerId: string;
  vendorId: string;
  items: Array<{
    productId: string;
    sku: string;
    title: string;
    priceInCents: number;
    quantity: number;
    imageUrl: string;
  }>;
  shippingAddress: {
    label: string;
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  totalInCents: number;
  platformCommissionInCents: number;
  status: string;
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ShipmentRow {
  _id: string;
  orderId: string;
  vendorId: string;
  carrier: string;
  trackingNumber: string;
  aggregatorShipmentId: string;
  status: string;
  estimatedDelivery?: Date;
  timeline: Array<{
    status: string;
    location: string;
    timestamp: Date;
    description: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Entity Schemas ──────────────────────────────────────────────────────────

const UserEntity = new EntitySchema<UserRow>({
  name: "User",
  tableName: "users",
  columns: {
    _id: { type: "uuid", primary: true, generated: "uuid" },
    email: { type: "varchar", length: 255, unique: true },
    passwordHash: { type: "varchar", length: 255 },
    role: { type: "varchar", length: 20, default: "customer" },
    profile: { type: "jsonb" },
    addresses: { type: "jsonb", default: () => "'[]'::jsonb" },
    status: { type: "varchar", length: 20, default: "active" },
    refreshTokenHash: { type: "varchar", length: 255, nullable: true },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  indices: [{ columns: ["email"], unique: true }, { columns: ["status"] }],
});

const VendorEntity = new EntitySchema<VendorRow>({
  name: "Vendor",
  tableName: "vendors",
  columns: {
    _id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", length: 100 },
    slug: { type: "varchar", length: 120, unique: true },
    description: { type: "varchar", length: 500, nullable: true },
    logo: { type: "varchar", length: 500, nullable: true },
    status: { type: "varchar", length: 20, default: "pending" },
    businessInfo: { type: "jsonb", nullable: true },
    stripeAccountId: { type: "varchar", length: 255, nullable: true },
    commissionRate: { type: "double precision", default: 0.12 },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  indices: [{ columns: ["slug"], unique: true }, { columns: ["status"] }],
});

const MembershipEntity = new EntitySchema<MembershipRow>({
  name: "Membership",
  tableName: "memberships",
  columns: {
    _id: { type: "uuid", primary: true, generated: "uuid" },
    userId: { type: "uuid" },
    vendorId: { type: "uuid" },
    role: { type: "varchar", length: 20, default: "owner" },
    permissions: {
      type: "text",
      array: true,
      default: () =>
        "ARRAY['manage_products','manage_orders','manage_inventory','manage_settings']::text[]",
    },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  indices: [
    { columns: ["userId", "vendorId"], unique: true },
    { columns: ["vendorId"] },
  ],
  foreignKeys: [
    {
      target: "users",
      columnNames: ["userId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
    {
      target: "vendors",
      columnNames: ["vendorId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
  ],
});

const ProductEntity = new EntitySchema<ProductRow>({
  name: "Product",
  tableName: "products",
  columns: {
    _id: { type: "uuid", primary: true, generated: "uuid" },
    vendorId: { type: "uuid" },
    title: { type: "varchar", length: 200 },
    slug: { type: "varchar", length: 255, unique: true },
    description: { type: "text", nullable: true },
    category: { type: "text", array: true, default: () => "ARRAY[]::text[]" },
    attributes: { type: "jsonb", default: () => "'{}'::jsonb" },
    variants: { type: "jsonb", default: () => "'[]'::jsonb" },
    status: { type: "varchar", length: 20, default: "draft" },
    rating: { type: "jsonb", default: () => '\'{"avg":0,"count":0}\'::jsonb' },
    tags: { type: "text", array: true, default: () => "ARRAY[]::text[]" },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  indices: [
    { columns: ["vendorId", "status"] },
    { columns: ["slug"], unique: true },
    { columns: ["category", "status"] },
  ],
  foreignKeys: [
    {
      target: "vendors",
      columnNames: ["vendorId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
  ],
});

const InventoryEntity = new EntitySchema<InventoryRow>({
  name: "Inventory",
  tableName: "inventory",
  columns: {
    _id: { type: "uuid", primary: true, generated: "uuid" },
    productId: { type: "uuid" },
    vendorId: { type: "uuid" },
    sku: { type: "varchar", length: 100, unique: true },
    quantityOnHand: { type: "int", default: 0 },
    quantityReserved: { type: "int", default: 0 },
    lowStockThreshold: { type: "int", default: 10 },
    warehouseLocation: { type: "varchar", length: 255, nullable: true },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  indices: [
    { columns: ["sku"], unique: true },
    { columns: ["productId"] },
    { columns: ["vendorId"] },
    { columns: ["quantityOnHand", "lowStockThreshold"] },
  ],
  checks: [
    { expression: '"quantityOnHand" >= 0' },
    { expression: '"quantityReserved" >= 0' },
  ],
  foreignKeys: [
    {
      target: "products",
      columnNames: ["productId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
    {
      target: "vendors",
      columnNames: ["vendorId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
  ],
});

const OrderEntity = new EntitySchema<OrderRow>({
  name: "Order",
  tableName: "orders",
  columns: {
    _id: { type: "uuid", primary: true, generated: "uuid" },
    orderNumber: { type: "varchar", length: 64, unique: true },
    customerId: { type: "uuid" },
    vendorId: { type: "uuid" },
    items: { type: "jsonb" },
    shippingAddress: { type: "jsonb" },
    subtotalInCents: { type: "int" },
    shippingInCents: { type: "int" },
    taxInCents: { type: "int" },
    totalInCents: { type: "int" },
    platformCommissionInCents: { type: "int" },
    status: { type: "varchar", length: 32, default: "pending" },
    paymentIntentId: { type: "varchar", length: 255, nullable: true },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  indices: [
    { columns: ["orderNumber"], unique: true },
    { columns: ["customerId"] },
    { columns: ["vendorId"] },
    { columns: ["status"] },
  ],
  foreignKeys: [
    {
      target: "users",
      columnNames: ["customerId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
    {
      target: "vendors",
      columnNames: ["vendorId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
  ],
});

const ShipmentEntity = new EntitySchema<ShipmentRow>({
  name: "Shipment",
  tableName: "shipments",
  columns: {
    _id: { type: "uuid", primary: true, generated: "uuid" },
    orderId: { type: "uuid" },
    vendorId: { type: "uuid" },
    carrier: { type: "varchar", length: 64 },
    trackingNumber: { type: "varchar", length: 128 },
    aggregatorShipmentId: { type: "varchar", length: 128 },
    status: { type: "varchar", length: 32, default: "pre_transit" },
    estimatedDelivery: { type: "timestamptz", nullable: true },
    timeline: { type: "jsonb", default: () => "'[]'::jsonb" },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  indices: [{ columns: ["orderId"] }, { columns: ["vendorId"] }],
  foreignKeys: [
    {
      target: "orders",
      columnNames: ["orderId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
    {
      target: "vendors",
      columnNames: ["vendorId"],
      referencedColumnNames: ["_id"],
      onDelete: "CASCADE",
    },
  ],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function now(): Date {
  return new Date();
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("\n🌱  Merizona Seeder (TypeORM)\n" + "─".repeat(50));
  console.log(
    `📦  Connecting to: ${DATABASE_URL.split("@").pop() ?? DATABASE_URL}`,
  );

  const dataSource = new DataSource({
    type: "postgres",
    url: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
    entities: [
      UserEntity,
      VendorEntity,
      MembershipEntity,
      ProductEntity,
      InventoryEntity,
      OrderEntity,
      ShipmentEntity,
    ],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  console.log("✅  Connected\n");

  const userRepo = dataSource.getRepository(UserEntity);
  const vendorRepo = dataSource.getRepository(VendorEntity);
  const membershipRepo = dataSource.getRepository(MembershipEntity);
  const productRepo = dataSource.getRepository(ProductEntity);
  const inventoryRepo = dataSource.getRepository(InventoryEntity);
  const orderRepo = dataSource.getRepository(OrderEntity);
  const shipmentRepo = dataSource.getRepository(ShipmentEntity);

  // ── Clear existing data ──────────────────────────────────────────────────────
  console.log("🗑️   Clearing existing data...");
  await dataSource.query(
    `TRUNCATE TABLE "shipments", "orders", "inventory", "products", "memberships", "vendors", "users" RESTART IDENTITY CASCADE`,
  );
  console.log("    Done.\n");

  // ── 1. Users ─────────────────────────────────────────────────────────────────
  console.log("👤  Seeding users...");
  const pw = (plain: string) => bcrypt.hash(plain, SALT_ROUNDS);

  const [
    adminHash,
    aliceHash,
    bobHash,
    carolHash,
    daveHash,
    johnHash,
    janeHash,
  ] = await Promise.all([
    pw("Admin123!"),
    pw("Vendor123!"),
    pw("Vendor123!"),
    pw("Vendor123!"),
    pw("Vendor123!"),
    pw("Customer123!"),
    pw("Customer123!"),
  ]);

  const users = await userRepo.save([
    {
      email: "admin@merizona.com",
      passwordHash: adminHash,
      role: "platform_admin",
      profile: { firstName: "Platform", lastName: "Admin" },
      addresses: [],
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      email: "alice@techgear.com",
      passwordHash: aliceHash,
      role: "customer",
      profile: {
        firstName: "Alice",
        lastName: "Chen",
        phone: "+1-555-100-0001",
      },
      addresses: [
        {
          label: "Home",
          line1: "742 Evergreen Terrace",
          city: "Springfield",
          state: "IL",
          zip: "62701",
          country: "US",
          isDefault: true,
        },
      ],
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      email: "bob@craftcorner.com",
      passwordHash: bobHash,
      role: "customer",
      profile: {
        firstName: "Bob",
        lastName: "Marley",
        phone: "+1-555-200-0002",
      },
      addresses: [
        {
          label: "Studio",
          line1: "12 Oak Street",
          city: "Portland",
          state: "OR",
          zip: "97201",
          country: "US",
          isDefault: true,
        },
      ],
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      email: "carol@fashionhub.com",
      passwordHash: carolHash,
      role: "customer",
      profile: {
        firstName: "Carol",
        lastName: "Davidson",
        phone: "+1-555-300-0003",
      },
      addresses: [
        {
          label: "Office",
          line1: "88 Fashion Ave",
          city: "New York",
          state: "NY",
          zip: "10001",
          country: "US",
          isDefault: true,
        },
      ],
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      email: "dave@techgear.com",
      passwordHash: daveHash,
      role: "customer",
      profile: { firstName: "Dave", lastName: "Kim" },
      addresses: [],
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      email: "john@example.com",
      passwordHash: johnHash,
      role: "customer",
      profile: {
        firstName: "John",
        lastName: "Smith",
        phone: "+1-555-400-0004",
      },
      addresses: [
        {
          label: "Home",
          line1: "1600 Pennsylvania Ave NW",
          city: "Washington",
          state: "DC",
          zip: "20500",
          country: "US",
          isDefault: true,
        },
      ],
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      email: "jane@example.com",
      passwordHash: janeHash,
      role: "customer",
      profile: { firstName: "Jane", lastName: "Doe", phone: "+1-555-500-0005" },
      addresses: [
        {
          label: "Home",
          line1: "221B Baker Street",
          city: "Seattle",
          state: "WA",
          zip: "98101",
          country: "US",
          isDefault: true,
        },
      ],
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    },
  ]);

  const [admin, alice, bob, carol, dave, john, jane] = users;
  void admin;
  console.log(`    Created ${users.length} users\n`);

  // ── 2. Vendors ───────────────────────────────────────────────────────────────
  console.log("🏪  Seeding vendors...");
  const vendors = await vendorRepo.save([
    {
      name: "TechGear Pro",
      slug: "techgear-pro",
      description:
        "Premium consumer electronics and tech accessories for the modern professional.",
      status: "approved",
      businessInfo: {
        legalName: "TechGear Pro LLC",
        taxId: "12-3456789",
        address: "500 Silicon Valley Blvd",
        city: "San Jose",
        state: "CA",
        country: "US",
      },
      stripeAccountId: "acct_seed_techgear",
      commissionRate: 0.1,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      name: "Craft Corner",
      slug: "craft-corner",
      description:
        "Handmade goods, craft supplies, and DIY kits made with love.",
      status: "approved",
      businessInfo: {
        legalName: "Craft Corner LLC",
        taxId: "98-7654321",
        address: "12 Oak Street",
        city: "Portland",
        state: "OR",
        country: "US",
      },
      stripeAccountId: "acct_seed_craftcorner",
      commissionRate: 0.12,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      name: "Fashion Hub",
      slug: "fashion-hub",
      description:
        "Curated fashion accessories — ethically sourced, beautifully crafted.",
      status: "pending",
      businessInfo: {
        legalName: "Fashion Hub Inc.",
        taxId: "55-1234567",
        address: "88 Fashion Ave",
        city: "New York",
        state: "NY",
        country: "US",
      },
      commissionRate: 0.15,
      createdAt: now(),
      updatedAt: now(),
    },
  ]);

  const [techgear, craftcorner, fashionhub] = vendors;
  console.log(`    Created ${vendors.length} vendors\n`);

  // ── 3. Memberships ───────────────────────────────────────────────────────────
  console.log("🔗  Seeding memberships...");
  const memberships = await membershipRepo.save([
    {
      userId: alice._id,
      vendorId: techgear._id,
      role: "owner",
      permissions: [
        "manage_products",
        "manage_orders",
        "manage_inventory",
        "manage_settings",
      ],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      userId: dave._id,
      vendorId: techgear._id,
      role: "staff",
      permissions: ["manage_products", "manage_orders", "manage_inventory"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      userId: bob._id,
      vendorId: craftcorner._id,
      role: "owner",
      permissions: [
        "manage_products",
        "manage_orders",
        "manage_inventory",
        "manage_settings",
      ],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      userId: carol._id,
      vendorId: fashionhub._id,
      role: "owner",
      permissions: [
        "manage_products",
        "manage_orders",
        "manage_inventory",
        "manage_settings",
      ],
      createdAt: now(),
      updatedAt: now(),
    },
  ]);
  console.log(`    Created ${memberships.length} memberships\n`);

  // ── 4. Products ──────────────────────────────────────────────────────────────
  console.log("📦  Seeding products...");

  const techProducts = await productRepo.save([
    {
      vendorId: techgear._id,
      title: "Wireless Noise-Cancelling Headphones",
      slug: "wireless-noise-cancelling-headphones",
      description:
        "Professional-grade wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality. Compatible with all Bluetooth 5.0 devices.",
      category: ["Electronics", "Audio"],
      attributes: {
        brand: "SoundWave",
        connectivity: "Bluetooth 5.0",
        batteryLife: "30 hours",
        weight: "250g",
      },
      variants: [
        {
          sku: "SWH-BLK",
          label: "Black",
          priceInCents: 19999,
          compareAtPriceInCents: 24999,
          images: [],
        },
        {
          sku: "SWH-WHT",
          label: "White",
          priceInCents: 19999,
          compareAtPriceInCents: 24999,
          images: [],
        },
        { sku: "SWH-NVY", label: "Navy Blue", priceInCents: 21999, images: [] },
      ],
      status: "published",
      rating: { avg: 4.7, count: 238 },
      tags: ["headphones", "wireless", "noise-cancelling", "audio"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: techgear._id,
      title: "Mechanical Keyboard TKL",
      slug: "mechanical-keyboard-tkl",
      description:
        "Tenkeyless mechanical keyboard with customizable RGB backlighting. Available with three switch types for different typing preferences.",
      category: ["Electronics", "Peripherals"],
      attributes: {
        brand: "TypeForce",
        layout: "TKL (80%)",
        backlighting: "RGB",
        connection: "USB-C / Wireless",
      },
      variants: [
        {
          sku: "MKB-RED",
          label: "Red Switches",
          priceInCents: 12999,
          images: [],
        },
        {
          sku: "MKB-BRN",
          label: "Brown Switches",
          priceInCents: 12999,
          images: [],
        },
        {
          sku: "MKB-BLU",
          label: "Blue Switches",
          priceInCents: 12999,
          images: [],
        },
      ],
      status: "published",
      rating: { avg: 4.5, count: 145 },
      tags: ["keyboard", "mechanical", "TKL", "RGB", "gaming"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: techgear._id,
      title: "12-in-1 USB-C Hub",
      slug: "12-in-1-usb-c-hub",
      description:
        "Expand your laptop's connectivity with this ultra-slim 12-in-1 hub. Supports 4K HDMI, 100W PD charging, SD/microSD, Ethernet, and 4× USB ports.",
      category: ["Electronics", "Accessories"],
      attributes: {
        brand: "ConnectPro",
        ports: "12",
        hdmi: "4K@60Hz",
        powerDelivery: "100W",
      },
      variants: [
        { sku: "UCH-SLV", label: "Space Grey", priceInCents: 5999, images: [] },
      ],
      status: "published",
      rating: { avg: 4.3, count: 412 },
      tags: ["USB-C", "hub", "adapter", "MacBook"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: techgear._id,
      title: "Smart Watch Series 5",
      slug: "smart-watch-series-5",
      description:
        "Advanced smartwatch with health tracking, GPS, 7-day battery, and seamless smartphone integration. Water-resistant to 50m.",
      category: ["Electronics", "Wearables"],
      attributes: {
        brand: "TimeTech",
        display: '1.9" AMOLED',
        battery: "7 days",
        waterResistance: "50m / 5ATM",
      },
      variants: [
        {
          sku: "SW5-BLK-S",
          label: "Black / Small",
          priceInCents: 29999,
          images: [],
        },
        {
          sku: "SW5-BLK-L",
          label: "Black / Large",
          priceInCents: 29999,
          images: [],
        },
        {
          sku: "SW5-SLV-S",
          label: "Silver / Small",
          priceInCents: 31999,
          images: [],
        },
        {
          sku: "SW5-SLV-L",
          label: "Silver / Large",
          priceInCents: 31999,
          images: [],
        },
      ],
      status: "published",
      rating: { avg: 4.6, count: 89 },
      tags: ["smartwatch", "wearable", "fitness", "GPS"],
      createdAt: now(),
      updatedAt: now(),
    },
  ]);

  const craftProducts = await productRepo.save([
    {
      vendorId: craftcorner._id,
      title: "Artisan Handmade Soap Gift Set",
      slug: "artisan-handmade-soap-gift-set",
      description:
        "A luxurious collection of 6 hand-poured soaps made with natural essential oils and botanical ingredients. Perfect as a gift or treat for yourself.",
      category: ["Home & Beauty", "Bath & Body"],
      attributes: {
        ingredients: "Natural essential oils, shea butter, coconut oil",
        quantity: "6 bars",
        weight: "600g total",
      },
      variants: [
        {
          sku: "SOAP-LAV",
          label: "Lavender & Mint",
          priceInCents: 3499,
          images: [],
        },
        {
          sku: "SOAP-CIT",
          label: "Citrus Burst",
          priceInCents: 3499,
          images: [],
        },
        {
          sku: "SOAP-OAT",
          label: "Oatmeal & Honey",
          priceInCents: 3699,
          images: [],
        },
      ],
      status: "published",
      rating: { avg: 4.9, count: 312 },
      tags: ["soap", "handmade", "gift", "natural", "bath"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: craftcorner._id,
      title: "Beginner Macramé Kit",
      slug: "beginner-macrame-kit",
      description:
        "Everything you need to create your first macramé wall hanging. Includes 200g cotton cord, wooden dowel, step-by-step photo guide, and 5 project patterns.",
      category: ["Crafts", "DIY"],
      attributes: {
        includes: "Cotton cord, wooden dowel, guide book",
        difficulty: "Beginner",
        cordLength: "50m total",
      },
      variants: [
        {
          sku: "MAC-KIT-SM",
          label: "Small (30cm)",
          priceInCents: 2499,
          images: [],
        },
        {
          sku: "MAC-KIT-LG",
          label: "Large (60cm)",
          priceInCents: 3999,
          images: [],
        },
      ],
      status: "published",
      rating: { avg: 4.8, count: 176 },
      tags: ["macramé", "craft", "DIY", "beginner", "kit"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: craftcorner._id,
      title: "Soy Wax Scented Candle Set",
      slug: "soy-wax-scented-candle-set",
      description:
        "Hand-poured soy wax candles using cotton wicks and premium fragrance oils. Burns cleanly for 40–50 hours. Set of 3.",
      category: ["Home & Beauty", "Candles"],
      attributes: {
        material: "100% soy wax",
        wickType: "Cotton",
        burnTime: "40–50 hours",
        quantity: "3 candles",
      },
      variants: [
        {
          sku: "CNDL-FOR",
          label: "Forest Walk",
          priceInCents: 2999,
          images: [],
        },
        {
          sku: "CNDL-VAN",
          label: "Vanilla Dream",
          priceInCents: 2999,
          images: [],
        },
        {
          sku: "CNDL-SEA",
          label: "Sea Breeze",
          priceInCents: 2999,
          images: [],
        },
      ],
      status: "published",
      rating: { avg: 4.7, count: 524 },
      tags: ["candle", "soy", "scented", "home", "gift"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: craftcorner._id,
      title: "Handcrafted Wooden Puzzle",
      slug: "handcrafted-wooden-puzzle",
      description:
        "Laser-cut wooden jigsaw puzzles featuring original illustrations by local artists. Each piece is uniquely shaped and beautifully finished.",
      category: ["Toys & Games", "Puzzles"],
      attributes: {
        material: "Birch wood",
        finish: "Non-toxic lacquer",
        packaging: "Kraft box with artist card",
      },
      variants: [
        {
          sku: "WDP-200",
          label: "200 pieces — Forest Animals",
          priceInCents: 3499,
          images: [],
        },
        {
          sku: "WDP-500",
          label: "500 pieces — Mountain Landscape",
          priceInCents: 4999,
          images: [],
        },
        {
          sku: "WDP-1K",
          label: "1000 pieces — City at Night",
          priceInCents: 6999,
          images: [],
        },
      ],
      status: "published",
      rating: { avg: 4.6, count: 98 },
      tags: ["puzzle", "wooden", "handmade", "gift", "game"],
      createdAt: now(),
      updatedAt: now(),
    },
  ]);

  const fashionProducts = await productRepo.save([
    {
      vendorId: fashionhub._id,
      title: "Linen Tote Bag",
      slug: "linen-tote-bag",
      description:
        "Minimalist tote bag made from 100% natural linen. Spacious main compartment, interior zip pocket, and reinforced handles. Perfect for everyday errands or the farmers market.",
      category: ["Fashion", "Bags"],
      attributes: {
        material: "100% natural linen",
        dimensions: "40×35×12cm",
        handles: "24cm drop",
      },
      variants: [
        { sku: "LTB-NAT", label: "Natural", priceInCents: 3299, images: [] },
        { sku: "LTB-BLK", label: "Black", priceInCents: 3299, images: [] },
        { sku: "LTB-TER", label: "Terracotta", priceInCents: 3499, images: [] },
      ],
      status: "draft",
      rating: { avg: 0, count: 0 },
      tags: ["tote", "linen", "eco", "bag"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: fashionhub._id,
      title: "Sterling Silver Hoop Earrings",
      slug: "sterling-silver-hoop-earrings",
      description:
        "Elegant handcrafted sterling silver hoop earrings. Lightweight and comfortable for all-day wear. Available in three sizes.",
      category: ["Fashion", "Jewelry"],
      attributes: {
        material: "925 Sterling Silver",
        closure: "Click-top",
        nickelFree: "Yes",
      },
      variants: [
        { sku: "SHE-S", label: "Small — 20mm", priceInCents: 2999, images: [] },
        {
          sku: "SHE-M",
          label: "Medium — 35mm",
          priceInCents: 3499,
          images: [],
        },
        { sku: "SHE-L", label: "Large — 50mm", priceInCents: 3999, images: [] },
      ],
      status: "draft",
      rating: { avg: 0, count: 0 },
      tags: ["earrings", "silver", "jewelry", "hoop"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: fashionhub._id,
      title: "Printed Silk Scarf",
      slug: "printed-silk-scarf",
      description:
        "Luxurious 100% silk scarf with exclusive hand-drawn botanical prints. Versatile enough to wear as a neckerchief, headband, or tied to your bag.",
      category: ["Fashion", "Accessories"],
      attributes: {
        material: "100% pure silk",
        dimensions: "90×90cm",
        careInstructions: "Dry clean only",
      },
      variants: [
        {
          sku: "PSS-FLRL",
          label: "Floral Garden",
          priceInCents: 7999,
          images: [],
        },
        {
          sku: "PSS-ABST",
          label: "Abstract Blue",
          priceInCents: 7999,
          images: [],
        },
      ],
      status: "draft",
      rating: { avg: 0, count: 0 },
      tags: ["scarf", "silk", "luxury", "accessories"],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      vendorId: fashionhub._id,
      title: "Merino Wool Beanie",
      slug: "merino-wool-beanie",
      description:
        "Supremely soft merino wool beanie. Naturally temperature-regulating and odour-resistant. Ethically sourced wool certified by the Responsible Wool Standard.",
      category: ["Fashion", "Hats"],
      attributes: {
        material: "100% Merino Wool",
        certification: "RWS certified",
        carInstructions: "Hand wash cold",
      },
      variants: [
        { sku: "MWB-CRM", label: "Cream", priceInCents: 4499, images: [] },
        { sku: "MWB-CHR", label: "Charcoal", priceInCents: 4499, images: [] },
        {
          sku: "MWB-FOR",
          label: "Forest Green",
          priceInCents: 4499,
          images: [],
        },
      ],
      status: "draft",
      rating: { avg: 0, count: 0 },
      tags: ["beanie", "merino", "wool", "hat", "winter"],
      createdAt: now(),
      updatedAt: now(),
    },
  ]);

  const allProducts = [...techProducts, ...craftProducts, ...fashionProducts];
  console.log(`    Created ${allProducts.length} products\n`);

  // ── 5. Inventory ──────────────────────────────────────────────────────────────
  console.log("📊  Seeding inventory...");
  const inventoryDocs: Array<Partial<InventoryRow>> = [];

  const stockMap: Record<
    string,
    { qty: number; reserved: number; threshold: number; loc: string }
  > = {
    "SWH-BLK": { qty: 142, reserved: 8, threshold: 20, loc: "A1-R1-S1" },
    "SWH-WHT": { qty: 95, reserved: 3, threshold: 20, loc: "A1-R1-S2" },
    "SWH-NVY": { qty: 48, reserved: 2, threshold: 10, loc: "A1-R1-S3" },
    "MKB-RED": { qty: 73, reserved: 5, threshold: 15, loc: "A1-R2-S1" },
    "MKB-BRN": { qty: 61, reserved: 4, threshold: 15, loc: "A1-R2-S2" },
    "MKB-BLU": { qty: 89, reserved: 6, threshold: 15, loc: "A1-R2-S3" },
    "UCH-SLV": { qty: 204, reserved: 12, threshold: 25, loc: "A1-R3-S1" },
    "SW5-BLK-S": { qty: 37, reserved: 2, threshold: 10, loc: "A1-R4-S1" },
    "SW5-BLK-L": { qty: 29, reserved: 1, threshold: 10, loc: "A1-R4-S2" },
    "SW5-SLV-S": { qty: 8, reserved: 0, threshold: 10, loc: "A1-R4-S3" },
    "SW5-SLV-L": { qty: 6, reserved: 0, threshold: 10, loc: "A1-R4-S4" },
    "SOAP-LAV": { qty: 180, reserved: 14, threshold: 30, loc: "B1-R1-S1" },
    "SOAP-CIT": { qty: 156, reserved: 9, threshold: 30, loc: "B1-R1-S2" },
    "SOAP-OAT": { qty: 94, reserved: 7, threshold: 20, loc: "B1-R1-S3" },
    "MAC-KIT-SM": { qty: 62, reserved: 3, threshold: 15, loc: "B1-R2-S1" },
    "MAC-KIT-LG": { qty: 41, reserved: 2, threshold: 10, loc: "B1-R2-S2" },
    "CNDL-FOR": { qty: 115, reserved: 8, threshold: 25, loc: "B1-R3-S1" },
    "CNDL-VAN": { qty: 138, reserved: 11, threshold: 25, loc: "B1-R3-S2" },
    "CNDL-SEA": { qty: 99, reserved: 6, threshold: 20, loc: "B1-R3-S3" },
    "WDP-200": { qty: 78, reserved: 4, threshold: 15, loc: "B1-R4-S1" },
    "WDP-500": { qty: 54, reserved: 2, threshold: 10, loc: "B1-R4-S2" },
    "WDP-1K": { qty: 23, reserved: 1, threshold: 8, loc: "B1-R4-S3" },
    "LTB-NAT": { qty: 45, reserved: 0, threshold: 10, loc: "C1-R1-S1" },
    "LTB-BLK": { qty: 38, reserved: 0, threshold: 10, loc: "C1-R1-S2" },
    "LTB-TER": { qty: 22, reserved: 0, threshold: 5, loc: "C1-R1-S3" },
    "SHE-S": { qty: 60, reserved: 0, threshold: 10, loc: "C1-R2-S1" },
    "SHE-M": { qty: 55, reserved: 0, threshold: 10, loc: "C1-R2-S2" },
    "SHE-L": { qty: 40, reserved: 0, threshold: 10, loc: "C1-R2-S3" },
    "PSS-FLRL": { qty: 30, reserved: 0, threshold: 5, loc: "C1-R3-S1" },
    "PSS-ABST": { qty: 25, reserved: 0, threshold: 5, loc: "C1-R3-S2" },
    "MWB-CRM": { qty: 50, reserved: 0, threshold: 10, loc: "C1-R4-S1" },
    "MWB-CHR": { qty: 45, reserved: 0, threshold: 10, loc: "C1-R4-S2" },
    "MWB-FOR": { qty: 35, reserved: 0, threshold: 10, loc: "C1-R4-S3" },
  };

  for (const product of allProducts) {
    for (const variant of product.variants) {
      const s = stockMap[variant.sku] ?? {
        qty: 50,
        reserved: 0,
        threshold: 10,
        loc: "GEN-RACK",
      };

      inventoryDocs.push({
        productId: product._id,
        vendorId: product.vendorId,
        sku: variant.sku,
        quantityOnHand: s.qty,
        quantityReserved: s.reserved,
        lowStockThreshold: s.threshold,
        warehouseLocation: s.loc,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  await inventoryRepo.save(inventoryDocs);
  console.log(`    Created ${inventoryDocs.length} inventory records\n`);

  // ── 6. Orders ─────────────────────────────────────────────────────────────────
  console.log("🛒  Seeding orders...");

  const headphonesProduct = techProducts[0];
  const kbProduct = techProducts[1];
  const soapProduct = craftProducts[0];
  const candleProduct = craftProducts[2];

  const orders = await orderRepo.save([
    {
      orderNumber: "MRZ-20260101-ABCD",
      customerId: john._id,
      vendorId: techgear._id,
      items: [
        {
          productId: headphonesProduct._id,
          sku: "SWH-BLK",
          title: "Wireless Noise-Cancelling Headphones",
          priceInCents: 19999,
          quantity: 1,
          imageUrl: "",
        },
        {
          productId: kbProduct._id,
          sku: "MKB-RED",
          title: "Mechanical Keyboard TKL",
          priceInCents: 12999,
          quantity: 1,
          imageUrl: "",
        },
      ],
      shippingAddress: {
        label: "Home",
        line1: "1600 Pennsylvania Ave NW",
        city: "Washington",
        state: "DC",
        zip: "20500",
        country: "US",
      },
      subtotalInCents: 32998,
      shippingInCents: 0,
      taxInCents: 2640,
      totalInCents: 35638,
      platformCommissionInCents: 3564,
      status: "delivered",
      paymentIntentId: "pi_seed_001",
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
    },
    {
      orderNumber: "MRZ-20260110-EFGH",
      customerId: john._id,
      vendorId: craftcorner._id,
      items: [
        {
          productId: soapProduct._id,
          sku: "SOAP-LAV",
          title: "Artisan Handmade Soap Gift Set",
          priceInCents: 3499,
          quantity: 2,
          imageUrl: "",
        },
        {
          productId: candleProduct._id,
          sku: "CNDL-VAN",
          title: "Soy Wax Scented Candle Set",
          priceInCents: 2999,
          quantity: 1,
          imageUrl: "",
        },
      ],
      shippingAddress: {
        label: "Home",
        line1: "1600 Pennsylvania Ave NW",
        city: "Washington",
        state: "DC",
        zip: "20500",
        country: "US",
      },
      subtotalInCents: 9997,
      shippingInCents: 499,
      taxInCents: 840,
      totalInCents: 11336,
      platformCommissionInCents: 1360,
      status: "shipped",
      paymentIntentId: "pi_seed_002",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
    },
    {
      orderNumber: "MRZ-20260115-IJKL",
      customerId: jane._id,
      vendorId: techgear._id,
      items: [
        {
          productId: headphonesProduct._id,
          sku: "SWH-WHT",
          title: "Wireless Noise-Cancelling Headphones",
          priceInCents: 19999,
          quantity: 1,
          imageUrl: "",
        },
      ],
      shippingAddress: {
        label: "Home",
        line1: "221B Baker Street",
        city: "Seattle",
        state: "WA",
        zip: "98101",
        country: "US",
      },
      subtotalInCents: 19999,
      shippingInCents: 0,
      taxInCents: 1800,
      totalInCents: 21799,
      platformCommissionInCents: 2180,
      status: "confirmed",
      paymentIntentId: "pi_seed_003",
      createdAt: daysAgo(1),
      updatedAt: now(),
    },
  ]);
  console.log(`    Created ${orders.length} orders\n`);

  // ── 7. Shipments ──────────────────────────────────────────────────────────────
  console.log("🚚  Seeding shipments...");

  const shipments = await shipmentRepo.save([
    {
      orderId: orders[0]._id,
      vendorId: techgear._id,
      carrier: "fedex",
      trackingNumber: "794644790132001",
      aggregatorShipmentId: "shp_seed_001",
      status: "delivered",
      estimatedDelivery: daysAgo(2),
      timeline: [
        {
          status: "label_created",
          location: "San Jose, CA",
          timestamp: daysAgo(14),
          description: "Shipping label created",
        },
        {
          status: "picked_up",
          location: "San Jose, CA",
          timestamp: daysAgo(13),
          description: "Package picked up by FedEx",
        },
        {
          status: "in_transit",
          location: "Phoenix, AZ",
          timestamp: daysAgo(12),
          description: "Package in transit",
        },
        {
          status: "in_transit",
          location: "Dallas, TX",
          timestamp: daysAgo(11),
          description: "Package in transit",
        },
        {
          status: "in_transit",
          location: "Memphis, TN",
          timestamp: daysAgo(10),
          description: "Arrived at FedEx hub",
        },
        {
          status: "in_transit",
          location: "Washington, DC",
          timestamp: daysAgo(3),
          description: "Out for final sorting",
        },
        {
          status: "out_for_delivery",
          location: "Washington, DC",
          timestamp: daysAgo(2),
          description: "Out for delivery",
        },
        {
          status: "delivered",
          location: "Washington, DC",
          timestamp: daysAgo(2),
          description: "Delivered — left at front door",
        },
      ],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
    },
    {
      orderId: orders[1]._id,
      vendorId: craftcorner._id,
      carrier: "ups",
      trackingNumber: "1Z999AA10123456784",
      aggregatorShipmentId: "shp_seed_002",
      status: "in_transit",
      estimatedDelivery: daysFromNow(2),
      timeline: [
        {
          status: "label_created",
          location: "Portland, OR",
          timestamp: daysAgo(5),
          description: "Shipping label created",
        },
        {
          status: "picked_up",
          location: "Portland, OR",
          timestamp: daysAgo(4),
          description: "Package picked up by UPS",
        },
        {
          status: "in_transit",
          location: "Sacramento, CA",
          timestamp: daysAgo(3),
          description: "Package in transit",
        },
        {
          status: "in_transit",
          location: "Salt Lake City, UT",
          timestamp: daysAgo(2),
          description: "Package in transit",
        },
        {
          status: "in_transit",
          location: "Denver, CO",
          timestamp: daysAgo(1),
          description: "Arrived at UPS facility",
        },
      ],
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
    },
  ]);
  console.log(`    Created ${shipments.length} shipments\n`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("─".repeat(50));
  console.log("✅  Seed complete!\n");
  console.log("📋  Test accounts:");
  console.log(
    "    ┌─────────────────────────────────┬────────────────┬──────────────────┐",
  );
  console.log(
    "    │ Email                           │ Password       │ Role             │",
  );
  console.log(
    "    ├─────────────────────────────────┼────────────────┼──────────────────┤",
  );
  console.log(
    "    │ admin@merizona.com              │ Admin123!      │ Platform Admin   │",
  );
  console.log(
    "    │ alice@techgear.com              │ Vendor123!     │ Vendor Owner     │",
  );
  console.log(
    "    │ bob@craftcorner.com             │ Vendor123!     │ Vendor Owner     │",
  );
  console.log(
    "    │ carol@fashionhub.com            │ Vendor123!     │ Vendor Owner     │",
  );
  console.log(
    "    │ dave@techgear.com               │ Vendor123!     │ Vendor Staff     │",
  );
  console.log(
    "    │ john@example.com                │ Customer123!   │ Customer         │",
  );
  console.log(
    "    │ jane@example.com                │ Customer123!   │ Customer         │",
  );
  console.log(
    "    └─────────────────────────────────┴────────────────┴──────────────────┘",
  );
  console.log("\n🏪  Vendors:");
  console.log("    TechGear Pro    → approved  (10% commission)");
  console.log("    Craft Corner    → approved  (12% commission)");
  console.log(
    "    Fashion Hub     → pending   (15% commission) ← approve via /admin/vendors",
  );
  console.log(
    "\n📦  Products: 8 published (TechGear + Craft Corner) + 4 drafts (Fashion Hub)",
  );
  console.log(
    `📊  Inventory: ${inventoryDocs.length} SKUs  |  ⚠️  Low stock: SW5-SLV-S, SW5-SLV-L`,
  );
  console.log(
    "🛒  Orders: 1 delivered, 1 shipped (live tracking), 1 confirmed",
  );
  console.log("─".repeat(50) + "\n");

  await dataSource.destroy();
}

seed().catch(async (err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
