import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CaslModule } from "../casl/casl.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentStrategyFactory } from "./payment-strategy.factory";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { StripePaymentStrategy } from "./strategies/stripe-payment.strategy";

@Module({
  imports: [AuthModule, CaslModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentStrategyFactory, StripePaymentStrategy],
  exports: [PaymentsService, PaymentStrategyFactory],
})
export class PaymentsModule {}
