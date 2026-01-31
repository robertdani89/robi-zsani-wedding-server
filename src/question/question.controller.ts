import { Controller, Get, Param, Query } from "@nestjs/common";
import { QuestionService } from "./question.service";

@Controller("questions")
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get()
  findAll() {
    return this.questionService.findAll();
  }

  @Get("random")
  getRandomQuestions(@Query("count") count?: string) {
    const questionCount = count ? parseInt(count, 10) : 8;
    return this.questionService.getRandomQuestions(questionCount);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.questionService.findOne(id);
  }
}
