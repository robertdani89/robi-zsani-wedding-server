import { AppModule } from "./app.module";
import { NestFactory } from "@nestjs/core";

const port = 8096;
const pathPrefix = "/api";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix(pathPrefix);

  await app.listen(port);
  console.log(`Wedding server is running on http://localhost:${port}`);
}

bootstrap();
