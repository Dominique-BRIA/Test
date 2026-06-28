import { IsString } from 'class-validator';

export class ComputeFeatureDto {
  @IsString()
  provider!: string;

  @IsString()
  source!: string;

  @IsString()
  target!: string;
}
