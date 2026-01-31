import { Guest } from "./guest.entity";
import { GuestController } from "./guest.controller";
import { GuestService } from "./guest.service";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestionModule } from "../question/question.module";

@Module({
  imports: [TypeOrmModule.forFeature([Guest]), QuestionModule],
  controllers: [GuestController],
  providers: [GuestService],
  exports: [GuestService],
})
export class GuestModule {}
