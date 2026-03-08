import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CheckAbility, CurrentUser } from "../../common/decorators";
import { UserContext } from "../../common/interfaces";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AbilityGuard } from "../casl/ability.guard";
import { InitiateCheckoutDto } from "./dto/initiate-checkout.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("providers")
  getCheckoutProviders(@CurrentUser() user: UserContext) {
    if (user.role !== "customer") {
      throw new ForbiddenException("Only customers can view payment providers");
    }

    return this.paymentsService.getCheckoutProviders();
  }

  @Post("checkout/initiate")
  @CheckAbility({ action: "create", subject: "Order" })
  async initiateCheckout(
    @CurrentUser() user: UserContext,
    @Body() dto: InitiateCheckoutDto,
  ) {
    if (user.role !== "customer") {
      throw new ForbiddenException("Only customers can initiate checkout");
    }

    return this.paymentsService.initiateCheckout(user._id, dto);
  }
}
