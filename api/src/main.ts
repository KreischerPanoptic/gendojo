import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api');

  // Required for class-validator decorators (@IsString, @IsInt, etc.) to work.
  // whitelist: true strips properties not declared in the DTO.
  // forbidNonWhitelisted: false — silently ignore extra fields rather than 400.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,           // auto-cast query params / body to DTO types
      transformOptions: {
        enableImplicitConversion: true, // number strings → number where @IsInt
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('GenDojo API')
    .setDescription(
      'REST API for the GenDojo diffusion model fine-tuning workbench. ' +
      'Covers dataset management, model downloads, job lifecycle, ' +
      'training presets, and system monitoring.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // keeps the JWT across page refreshes in Swagger UI
    },
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

bootstrap();