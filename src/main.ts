import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 REQUIRED for @Query() pagination DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,   // enables class-transformer
      whitelist: true,   // strips unknown query/body fields
    }),
  );

  console.log(process.env.DATABASE_URL);

  await app.listen(process.env.PORT ?? 4900);
}
bootstrap();
