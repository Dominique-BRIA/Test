import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../user/user.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const user = await this.userService.validateSession(auth.slice(7));
    if (!user) throw new UnauthorizedException();
    (request as unknown as Record<string, unknown>)['userId'] = user.userId;
    (request as unknown as Record<string, unknown>)['userEmail'] = user.email;
    return true;
  }
}
