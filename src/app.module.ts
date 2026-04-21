import { AdminModule } from "./admin/admin.module";
import { AnswerModule } from "./answer/answer.module";
import { AppController } from "./app.controller";
import { ConfigModule } from "@nestjs/config";
import { ErrorReportModule } from "./error-report/error-report.module";
import { EventModule } from "./event/event.module";
import { GalleryModule } from "./gallery/gallery.module";
import { GiftModule } from "./gift/gift.module";
import { Module } from "@nestjs/common";
import { PersonModule } from "./person/person.module";
import { PhotoModule } from "./photo/photo.module";
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
    ErrorReportModule,
    PersonModule,
    EventModule,
    PhotoModule,
    AnswerModule,
    AdminModule,
    SongModule,
    GalleryModule,
    GiftModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
