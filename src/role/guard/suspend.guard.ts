import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";

@Injectable()
export class SuspendedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (
      dbUser?.isSuspended &&
      dbUser.suspendedUntil &&
      dbUser.suspendedUntil > new Date()
    ) {
      throw new ForbiddenException("Account suspended");
    }

    return true;
  }
}
