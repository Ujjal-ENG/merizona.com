import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  AbilityRequirement,
  CHECK_ABILITY_KEY,
} from "../../common/decorators/check-ability.decorator";
import { UserContext } from "../../common/interfaces";
import { CaslAbilityFactory } from "./casl-ability.factory";

/**
 * ABAC Guard — checks CASL abilities defined via @CheckAbility() decorator.
 *
 * This guard verifies that the authenticated user has the required ability
 * (action + subject) to access a resource. Ownership conditions (e.g., vendorId)
 * are baked into the ability factory, so this guard automatically enforces
 * multi-tenant isolation.
 */
@Injectable()
export class AbilityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements =
      this.reflector.get<AbilityRequirement[]>(
        CHECK_ABILITY_KEY,
        context.getHandler(),
      ) || [];

    // If no ability requirements, allow access (rely on JwtAuthGuard only)
    if (requirements.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserContext = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    for (const requirement of requirements) {
      if (!ability.can(requirement.action as any, requirement.subject as any)) {
        throw new ForbiddenException(
          `Insufficient permissions: cannot ${requirement.action} ${requirement.subject}`,
        );
      }
    }

    return true;
  }
}
