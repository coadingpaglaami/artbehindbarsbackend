import { Reflector } from "@nestjs/core";

export const ROLES = ['ADMIN', 'USER'] as const;

export type Role = (typeof ROLES)[number];
export const Roles = Reflector.createDecorator<Role[]>();