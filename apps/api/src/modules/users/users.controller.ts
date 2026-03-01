import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators";
import { UserContext } from "../../common/interfaces";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async getMe(@CurrentUser() user: UserContext) {
    return this.usersService.findByIdOrFail(user._id);
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user._id, dto);
  }
}
