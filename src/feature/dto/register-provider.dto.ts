import { IsString, IsIn, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderCategory } from '../../shared/types';

export class RegisterProviderDto {
  @ApiProperty({
    description:
      'Unique name for this scoring provider. Used as the key when calling /features/compute.',
    example: 'skill-similarity',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description:
      'Category determines how the provider is used in the pipeline:\n' +
      '- `graph` — uses graph topology (degree, paths)\n' +
      '- `attribute` — uses node/edge attributes\n' +
      '- `embedding` — produces or consumes vector embeddings\n' +
      '- `external` — calls a remote HTTP microservice',
    enum: ['graph', 'attribute', 'embedding', 'external'],
    example: 'attribute',
  })
  @IsIn(['graph', 'attribute', 'embedding', 'external'])
  category!: ProviderCategory;

  @ApiPropertyOptional({
    description:
      'For `external` providers: URL of the scoring microservice. ' +
      'YowLinker will POST `{ source, target, context }` to this URL and expect `{ score: number }`.',
    example: 'https://my-scorer.internal/score',
  })
  @IsUrl()
  @IsOptional()
  remoteUrl?: string;
}
