import * as dotenv from 'dotenv';
dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log(process.env.FRONTEND_URL);
  console.log(process.env.SMTP_HOST);
  console.log(process.env.SMTP_PORT);
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_NETWORK_URL,
      process.env.BACKEND_NETWORK_URL,
      process.env.BACKEND_URL,
    ],
    credentials: true,
  });

  app.use(cookieParser());

  // 🔥 REQUIRED for @Query() pagination DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // enables class-transformer
      whitelist: true, // strips unknown query/body fields
    }),
  );

  console.log(process.env.DATABASE_URL);

  await app.listen(process.env.PORT!);
}
bootstrap();
