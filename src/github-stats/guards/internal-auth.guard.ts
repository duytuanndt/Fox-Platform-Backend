import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expectedToken = this.configService.get<string>(
      'github.internalToken',
      {
        infer: true,
      },
    );

    if (!expectedToken) {
      return true;
    }

    const incomingToken = request.headers['x-internal-token'];

    if (incomingToken !== expectedToken) {
      throw new UnauthorizedException('Invalid internal token');
    }

    return true;
  }
}
