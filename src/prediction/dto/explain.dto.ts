import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExplainDto {
  @ApiProperty({
    description: 'UUID of the source node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  source!: string;

  @ApiProperty({
    description: 'UUID of the target node.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  target!: string;
}
