import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { Answer } from "../answer/answer.entity";
import { Module } from "@nestjs/common";
import { Person } from "../person/person.entity";
import { Photo } from "../photo/photo.entity";
import { Song } from "../song/song.entity";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Person, Answer, Photo, Song])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
