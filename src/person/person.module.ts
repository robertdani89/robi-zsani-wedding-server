import { Event } from "../event/event.entity";
import { Module } from "@nestjs/common";
import { Person } from "./person.entity";
import { PersonController } from "./person.controller";
import { PersonService } from "./person.service";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Person, Event])],
  controllers: [PersonController],
  providers: [PersonService],
  exports: [PersonService],
})
export class PersonModule {}
