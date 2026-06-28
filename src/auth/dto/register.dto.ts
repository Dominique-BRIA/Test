import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address of the new account. Must be unique.',
    example: 'alice@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password — minimum 8 characters. Stored as PBKDF2-SHA512 (100 000 iterations, random salt).',
    example: 'mysecretpass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
