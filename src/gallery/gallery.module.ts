import { GalleryController } from "./gallery.controller";
import { GalleryService } from "./gallery.service";
import { Module } from "@nestjs/common";
import { Photo } from "../photo/photo.entity";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  controllers: [GalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
