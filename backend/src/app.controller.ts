import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

// NestJS iskeletinden gelen basit erişilebilirlik kontrolü; finansal veri
// içermediği için açıktır ve API dokümantasyonuna dahil edilmez.
@ApiExcludeController()
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
