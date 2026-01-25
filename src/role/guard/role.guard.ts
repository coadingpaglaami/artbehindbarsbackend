import { CanActivate, ConsoleLogger, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role, Roles } from "../decorators/role.decorator.js";

function matchRoles(
  requiredRoles: Role[],
  userRoles: Role[],
): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector:Reflector){}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get(Roles,context.getHandler());
        if(!roles){
            return true;
        }

        const request = context.switchToHttp().getRequest();
        // console.log(request)
        const user = request.user;
        // console.log(user)

        // console.log(user.role)
        console.log(user.role,'user role in guard');

        return matchRoles(roles, user.role);
        
    }
}