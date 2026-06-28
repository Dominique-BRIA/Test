import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from '../user/user.service';
import { SessionGuard } from './session.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../shared/types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Create a new account',
    description:
      'Registers a new user. Passwords are hashed with PBKDF2-SHA512 (100 000 iterations, 16-byte random salt). ' +
      'Returns the email of the created account.',
  })
  @ApiBody({ type: RegisterDto })
  @SwaggerResponse({
    status: 201,
    description: 'Account created successfully.',
    schema: { example: { data: { email: 'alice@example.com' } } },
  })
  @SwaggerResponse({ status: 400, description: 'Validation error (invalid email or short password).' })
  @SwaggerResponse({ status: 409, description: 'Email already in use.' })
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<{ email: string }>> {
    const user = await this.userService.register(dto.email, dto.password);
    return { data: { email: user.email } };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sign in and obtain a session token',
    description:
      'Validates credentials with a constant-time comparison. ' +
      'Returns a 256-bit session token (base64url). ' +
      'Pass it as `Authorization: Bearer <token>` on all dashboard routes.',
  })
  @ApiBody({ type: LoginDto })
  @SwaggerResponse({
    status: 200,
    description: 'Login successful.',
    schema: { example: { data: { token: 'v2_A3fB...base64url...xZ' } } },
  })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto): Promise<ApiResponse<{ token: string }>> {
    const token = await this.userService.login(dto.email, dto.password);
    return { data: { token } };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiBearerAuth('session')
  @ApiOperation({
    summary: 'Get current user identity',
    description: 'Returns the `userId` and `email` associated with the provided session token.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Current user identity.',
    schema: { example: { data: { userId: 'uuid-here', email: 'alice@example.com' } } },
  })
  @SwaggerResponse({ status: 401, description: 'Missing or invalid session token.' })
  me(
    @Req() req: Request & Record<string, unknown>,
  ): ApiResponse<{ userId: string; email: string }> {
    return {
      data: {
        userId: String(req['userId']),
        email: String(req['userEmail']),
      },
    };
  }

  @Delete('logout')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  @ApiBearerAuth('session')
  @ApiOperation({
    summary: 'Revoke current session',
    description: 'Deletes the session token from the database. The token becomes immediately invalid.',
  })
  @SwaggerResponse({ status: 204, description: 'Session revoked.' })
  @SwaggerResponse({ status: 401, description: 'Missing or invalid session token.' })
  async logout(@Req() req: Request): Promise<void> {
    const auth = req.headers['authorization'];
    if (auth?.startsWith('Bearer ')) {
      await this.userService.revokeSession(auth.slice(7));
    }
  }
}
