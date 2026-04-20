import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event, EventQuestion } from "./event.entity";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const existing = await this.eventRepository.findOne({
      where: { code: createEventDto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Event with code "${createEventDto.code}" already exists`,
      );
    }

    const event = this.eventRepository.create(createEventDto);
    return this.eventRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventRepository.find({ order: { createdAt: "DESC" } });
  }

  async findOne(id: string): Promise<Event> {
    return this.eventRepository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<Event> {
    return this.eventRepository.findOne({ where: { code } });
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }
    Object.assign(event, updateEventDto);
    return this.eventRepository.save(event);
  }

  async updateByCode(
    code: string,
    updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    const event = await this.findByCode(code);
    if (!event) {
      throw new NotFoundException(`Event with code "${code}" not found`);
    }
    Object.assign(event, updateEventDto);
    return this.eventRepository.save(event);
  }

  async updateQuestions(
    code: string,
    questions: EventQuestion[],
  ): Promise<Event> {
    const event = await this.findByCode(code);
    if (!event) {
      throw new NotFoundException(`Event with code "${code}" not found`);
    }
    event.questions = questions;
    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    await this.eventRepository.delete(id);
  }
}
