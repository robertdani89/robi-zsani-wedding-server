import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Question } from "./question.entity";
import { QUESTION_DEFINITIONS } from "./questions";

@Injectable()
export class QuestionService implements OnModuleInit {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async onModuleInit() {
    await this.seedQuestions();
  }

  private async seedQuestions() {
    const count = await this.questionRepository.count();
    if (count === 0) {
      for (const question of QUESTION_DEFINITIONS) {
        await this.questionRepository.save(question);
      }
    }
  }

  async findAll(): Promise<Question[]> {
    return this.questionRepository.find();
  }

  async findOne(id: string): Promise<Question> {
    return this.questionRepository.findOne({ where: { id } });
  }

  async getRandomQuestions(count: number = 8): Promise<Question[]> {
    const allQuestions = await this.findAll();
    // const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    // return shuffled.slice(0, Math.min(count, shuffled.length));
    return allQuestions.slice(0, Math.min(count, allQuestions.length));
  }
}
