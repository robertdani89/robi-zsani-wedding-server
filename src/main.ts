import { AppModule } from "./app.module";
import { NestFactory } from "@nestjs/core";
import { WsAdapter } from "@nestjs/platform-ws";

const port = 8096;
const pathPrefix = "/api";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors();
  app.setGlobalPrefix(pathPrefix);

  await app.listen(port);
  console.log(`Wedding server is running on http://localhost:${port}`);
  console.log(`Gift server WebSocket: ws://localhost:${port}/gift-ws`);
}

bootstrap();
