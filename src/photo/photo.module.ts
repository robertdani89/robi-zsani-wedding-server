import { Module } from "@nestjs/common";
import { Photo } from "./photo.entity";
import { PhotoController } from "./photo.controller";
import { PhotoService } from "./photo.service";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  controllers: [PhotoController],
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotoModule {}
