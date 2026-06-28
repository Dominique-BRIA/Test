import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ComputeDto {
  @ApiProperty({
    description: 'Name of the registered scoring provider to invoke.',
    example: 'skill-similarity',
  })
  @IsString()
  provider!: string;

  @ApiProperty({
    description: 'UUID or identifier of the source node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  source!: string;

  @ApiProperty({
    description: 'UUID or identifier of the target node.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsString()
  target!: string;
}
