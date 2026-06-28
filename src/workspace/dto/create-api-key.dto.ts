import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Label for this API key. Used only for identification in the dashboard.',
    example: 'production',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
