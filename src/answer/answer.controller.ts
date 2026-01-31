import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
} from "@nestjs/common";
import { AnswerService } from "./answer.service";
import { CreateAnswerDto } from "./dto/create-answer.dto";

@Controller("answers")
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post()
  create(@Body() createAnswerDto: CreateAnswerDto) {
    return this.answerService.create(createAnswerDto);
  }

  @Get()
  findAll() {
    return this.answerService.findAll();
  }

  @Get("guest/:guestId")
  findByGuest(@Param("guestId") guestId: string) {
    return this.answerService.findByGuest(guestId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.answerService.findOne(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.answerService.remove(id);
  }
}
