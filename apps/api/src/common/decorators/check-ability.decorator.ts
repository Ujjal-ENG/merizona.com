import { SetMetadata } from "@nestjs/common";

export interface AbilityRequirement {
  action: string;
  subject: string;
}

export const CHECK_ABILITY_KEY = "check_ability";

/**
 * Decorator to define ABAC ability requirements on a route.
 * Usage: @CheckAbility({ action: 'update', subject: 'Product' })
 */
export const CheckAbility = (...requirements: AbilityRequirement[]) =>
  SetMetadata(CHECK_ABILITY_KEY, requirements);
