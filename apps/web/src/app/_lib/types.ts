// ─── Domain Types ────────────────────────────────────────────────────────────

export type UserRole =
  | "platform_admin"
  | "vendor_owner"
  | "vendor_staff"
  | "customer";

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Address {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  addresses: Address[];
  status: "active" | "suspended" | "deleted";
  createdAt: string;
  updatedAt: string;
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export interface Vendor {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  status: "pending" | "approved" | "suspended";
  businessInfo: {
    legalName: string;
    taxId?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  stripeAccountId?: string;
  commissionRate: number;
  packageTier: "starter" | "growth" | "scale";
  packagePriceInCents: number;
  packageStatus: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface VendorMarketplaceStats {
  productCount: number;
  reviewCount: number;
  avgRating: number;
}

export type PaymentProvider = "stripe";

export interface PaymentProviderOption {
  provider: PaymentProvider;
  label: string;
  description: string;
}

export interface PaymentProviderListing {
  defaultProvider: PaymentProvider;
  providers: PaymentProviderOption[];
}

export interface PublicVendor {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: "pending" | "approved" | "suspended";
  businessInfo?: {
    legalName: string;
    taxId?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  createdAt: string;
  updatedAt: string;
  stats: VendorMarketplaceStats;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductVariant {
  sku: string;
  label: string;
  priceInCents: number;
  compareAtPriceInCents?: number;
  images: string[];
}

export interface Product {
  _id: string;
  vendorId: string;
  vendorName?: string;
  vendorSlug?: string;
  title: string;
  slug: string;
  description: string;
  category: string[];
  attributes: Record<string, string>;
  variants: ProductVariant[];
  status: "draft" | "published" | "archived";
  rating: { avg: number; count: number };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  _id: string;
  productId: string;
  vendorId: string;
  sku: string;
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold: number;
  warehouseLocation?: string;
  updatedAt: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  productId: string;
  sku: string;
  title: string;
  priceInCents: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  vendorId: string;
  items: OrderItem[];
  shippingAddress: Address;
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  totalInCents: number;
  platformCommissionInCents: number;
  status: OrderStatus;
  paymentIntentId?: string;
  paymentProvider?: PaymentProvider;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutResult {
  orders: Order[];
  summary: {
    orderCount: number;
    vendorCount: number;
    subtotalInCents: number;
    shippingInCents: number;
    taxInCents: number;
    totalInCents: number;
    platformCommissionInCents: number;
  };
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export type TrackingStatus =
  | "label_created"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export interface TrackingEvent {
  status: TrackingStatus;
  location: string;
  timestamp: string;
  description: string;
}

export interface Shipment {
  _id: string;
  orderId: string;
  vendorId: string;
  carrier: string;
  trackingNumber: string;
  aggregatorShipmentId: string;
  status: string;
  estimatedDelivery?: string;
  timeline: TrackingEvent[];
  createdAt: string;
  updatedAt: string;
}

// ─── Cart (client-side) ───────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantSku: string;
  title: string;
  variantLabel: string;
  priceInCents: number;
  quantity: number;
  imageUrl: string;
  vendorId: string;
  vendorName: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
