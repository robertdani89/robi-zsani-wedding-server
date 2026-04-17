import { AdminModule } from "./admin/admin.module";
import { AnswerModule } from "./answer/answer.module";
import { AppController } from "./app.controller";
import { ConfigModule } from "@nestjs/config";
import { GalleryModule } from "./gallery/gallery.module";
import { GiftModule } from "./gift/gift.module";
import { GuestModule } from "./guest/guest.module";
import { Module } from "@nestjs/common";
import { PhotoModule } from "./photo/photo.module";
import { QuestionModule } from "./question/question.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { SongModule } from "./song/song.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "wedding.db",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
    }),
    GuestModule,
    PhotoModule,
    QuestionModule,
    AnswerModule,
    AdminModule,
    SongModule,
    GalleryModule,
    GiftModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
