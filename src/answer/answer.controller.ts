import { Controller, Get, Post, Body, Param, Delete } from "@nestjs/common";
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

  @Get("person/:personId")
  findByPerson(@Param("personId") personId: string) {
    return this.answerService.findByPerson(personId);
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
