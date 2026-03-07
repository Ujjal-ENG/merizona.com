import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "./modules/auth/auth.module";
import { CaslModule } from "./modules/casl/casl.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { UsersModule } from "./modules/users/users.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";

@Module({
  imports: [
    // Global config — loads .env from monorepo root
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),

    // Global rate limiting backed by in-memory (Redis adapter can be added later)
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second
        limit: 20, // 20 requests per second
      },
      {
        name: "medium",
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Core infrastructure
    DatabaseModule,
    HealthModule,

    // Authorization
    CaslModule,

    // Feature modules
    AuthModule,
    UsersModule,
    VendorsModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    WebhooksModule,
  ],
  providers: [
    // Apply throttle guard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
