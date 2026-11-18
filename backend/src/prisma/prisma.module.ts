import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global modül: PrismaService'i her modülde ayrıca import etmeden
 * enjekte edebilmek için AppModule'e bir kez eklenmesi yeterlidir.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
