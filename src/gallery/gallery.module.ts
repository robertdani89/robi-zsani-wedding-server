import { GalleryController } from "./gallery.controller";
import { GalleryService } from "./gallery.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [GalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
