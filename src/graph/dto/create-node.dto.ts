import { IsUUID, IsString, MinLength, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNodeDto {
  @ApiProperty({
    description: 'Client-supplied UUID v4 that uniquely identifies this node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    description: 'UUID of the workspace this node belongs to.',
    example: 'c0473e6e-a61e-4cea-a8b5-8bdeaae327cc',
  })
  @IsUUID()
  workspace_id!: string;

  @ApiProperty({
    description:
      'Semantic type of the node within your domain. ' +
      'Examples: student, course, property, book, machine.',
    example: 'student',
  })
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiPropertyOptional({
    description:
      'Arbitrary JSON attributes for this node. ' +
      'These are stored as-is and passed to scoring providers.',
    example: { name: 'Alice Dupont', age: 22, level: 'MSc' },
  })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;
}
