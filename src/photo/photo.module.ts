import * as path from "path";

import { GalleryModule } from "../gallery/gallery.module";
import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { Photo } from "./photo.entity";
import { PhotoController } from "./photo.controller";
import { PhotoService } from "./photo.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { diskStorage } from "multer";
import { v4 as uuidv4 } from "uuid";

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo]),
    GalleryModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  ],
  controllers: [PhotoController],
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotoModule {}
