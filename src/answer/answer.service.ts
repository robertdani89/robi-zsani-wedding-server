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
    // Check if answer already exists for this person and question
    const existing = await this.answerRepository.findOne({
      where: {
        personId: createAnswerDto.personId,
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
    return this.answerRepository.find({ relations: ["person", "question"] });
  }

  async findByPerson(personId: string): Promise<Answer[]> {
    return this.answerRepository.find({
      where: { personId },
      relations: ["question"],
    });
  }

  async findOne(id: string): Promise<Answer> {
    return this.answerRepository.findOne({
      where: { id },
      relations: ["person", "question"],
    });
  }

  async remove(id: string): Promise<void> {
    await this.answerRepository.delete(id);
  }
}
