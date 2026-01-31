import { Guest } from "../guest/guest.entity";
import { Module } from "@nestjs/common";
import { Song } from "./song.entity";
import { SongController } from "./song.controller";
import { SongService } from "./song.service";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Song, Guest])],
  controllers: [SongController],
  providers: [SongService],
  exports: [SongService],
})
export class SongModule {}
