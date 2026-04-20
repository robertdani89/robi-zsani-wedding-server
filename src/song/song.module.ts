import { Module } from "@nestjs/common";
import { Person } from "../person/person.entity";
import { Song } from "./song.entity";
import { SongController } from "./song.controller";
import { SongService } from "./song.service";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Song, Person])],
  controllers: [SongController],
  providers: [SongService],
  exports: [SongService],
})
export class SongModule {}
