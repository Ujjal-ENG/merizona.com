import { Module } from "@nestjs/common";
import { AbilityGuard } from "./ability.guard";
import { CaslAbilityFactory } from "./casl-ability.factory";

@Module({
  providers: [CaslAbilityFactory, AbilityGuard],
  exports: [CaslAbilityFactory, AbilityGuard],
})
export class CaslModule {}
