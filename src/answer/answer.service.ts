import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Answer } from "./answer.entity";
import { CreateAnswerDto } from "./dto/create-answer.dto";

@Injectable()
export class AnswerService {
  constructor(
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
  ) {}

  async create(createAnswerDto: CreateAnswerDto): Promise<Answer> {
    // Check if answer already exists for this guest and question
    const existing = await this.answerRepository.findOne({
      where: {
        guestId: createAnswerDto.guestId,
        questionId: createAnswerDto.questionId,
      },
    });

    if (existing) {
      // Update existing answer
      existing.value = createAnswerDto.value;
      return this.answerRepository.save(existing);
    }

    // Create new answer
    const answer = this.answerRepository.create(createAnswerDto);
    return this.answerRepository.save(answer);
  }

  async findAll(): Promise<Answer[]> {
    return this.answerRepository.find({ relations: ["guest", "question"] });
  }

  async findByGuest(guestId: string): Promise<Answer[]> {
    return this.answerRepository.find({
      where: { guestId },
      relations: ["question"],
    });
  }

  async findOne(id: string): Promise<Answer> {
    return this.answerRepository.findOne({
      where: { id },
      relations: ["guest", "question"],
    });
  }

  async remove(id: string): Promise<void> {
    await this.answerRepository.delete(id);
  }
}
