import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description:
      'Korunan endpoint\'lerde "Authorization: Bearer <token>" olarak gönderilir',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ example: 'Bearer', enum: ['Bearer'] })
  tokenType: 'Bearer';

  @ApiProperty({
    description: 'Token geçerlilik süresi (saniye)',
    example: 3600,
  })
  expiresIn: number;
}
