import { IsUUID, IsInt, Min, Max, IsArray, IsString } from 'class-validator';

export class QueryGraphDto {
  @IsUUID()
  node!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  depth!: number;

  @IsArray()
  @IsString({ each: true })
  relations!: string[];
}
