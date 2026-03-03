import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class SuspendedGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) {
      return true; // allow public routes
    }

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    if (!user) return true; // not logged in

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (
      dbUser?.isSuspended &&
      dbUser.suspendedUntil &&
      dbUser.suspendedUntil > new Date()
    ) {
      throw new ForbiddenException('Account suspended');
    }

    return true;
  }
}
