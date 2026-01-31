import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Guest } from "./guest.entity";
import { CreateGuestDto } from "./dto/create-guest.dto";
import { UpdateGuestDto } from "./dto/update-guest.dto";
import { QuestionService } from "../question/question.service";

@Injectable()
export class GuestService {
  constructor(
    @InjectRepository(Guest)
    private guestRepository: Repository<Guest>,
    private questionService: QuestionService,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    const guest = this.guestRepository.create(createGuestDto);
    return this.guestRepository.save(guest);
  }

  async registerWithQuestions(
    name: string,
    questionCount: number = 8,
  ): Promise<{ guest: Guest; questions: any[] }> {
    // Get random questions
    const questions =
      await this.questionService.getRandomQuestions(questionCount);
    const questionIds = questions.map((q) => q.id);

    // Create guest with assigned questions
    const guest = this.guestRepository.create({
      name,
      assignedQuestionIds: questionIds,
    });
    const savedGuest = await this.guestRepository.save(guest);

    return {
      guest: savedGuest,
      questions,
    };
  }

  async findAll(): Promise<Guest[]> {
    return this.guestRepository.find();
  }

  async findOne(id: string): Promise<Guest> {
    return this.guestRepository.findOne({ where: { id } });
  }

  async getAssignedQuestions(guestId: string): Promise<any[]> {
    const guest = await this.findOne(guestId);
    if (!guest || !guest.assignedQuestionIds) {
      return [];
    }

    const questions = await Promise.all(
      guest.assignedQuestionIds.map((id) => this.questionService.findOne(id)),
    );
    return questions.filter((q) => q !== null);
  }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<Guest> {
    await this.guestRepository.update(id, updateGuestDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.guestRepository.delete(id);
  }
}
