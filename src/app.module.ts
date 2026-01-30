import { AppController } from "./app.controller";
import { GuestModule } from "./guest/guest.module";
import { Module } from "@nestjs/common";
import { PhotoModule } from "./photo/photo.module";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "wedding.db",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: true,
    }),
    GuestModule,
    PhotoModule,

  ],

  controllers: [AppController],
})
export class AppModule {}
