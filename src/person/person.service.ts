import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Person, PersonRole } from "./person.entity";
import { CreatePersonDto } from "./dto/create-person.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { Event } from "../event/event.entity";

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    const event = await this.eventRepository.findOne({
      where: { code: createPersonDto.eventCode },
    });
    if (!event) {
      throw new NotFoundException(
        `Event with code "${createPersonDto.eventCode}" not found`,
      );
    }

    const person = this.personRepository.create({
      name: createPersonDto.name,
      role: createPersonDto.role ?? PersonRole.GUEST,
      assignedQuestionIds: createPersonDto.assignedQuestionIds ?? null,
      event,
      eventId: event.id,
    });
    return this.personRepository.save(person);
  }

  async registerWithQuestions(
    name: string,
    eventCode: string,
    role: PersonRole = PersonRole.GUEST,
  ): Promise<{ person: Person; questions: any[] }> {
    const event = await this.eventRepository.findOne({
      where: { code: eventCode },
    });
    if (!event) {
      throw new NotFoundException(`Event with code "${eventCode}" not found`);
    }

    // Get questions from the event's own question list
    const eventQuestions = event.questions ?? [];
    const mandatory = eventQuestions.slice(0, 3);
    const randomized = eventQuestions.slice(3).sort(() => 0.5 - Math.random()).slice(0, 2);
    
    const selected = [...mandatory, ...randomized];
    const questionIds = selected.map((q) => q.id);

    const person = this.personRepository.create({
      name,
      role,
      assignedQuestionIds: questionIds,
      event,
      eventId: event.id,
    });
    const savedPerson = await this.personRepository.save(person);

    return {
      person: savedPerson,
      questions: selected,
    };
  }

  async findAll(): Promise<Person[]> {
    return this.personRepository.find({ relations: ["event"] });
  }

  async findOne(id: string): Promise<Person> {
    return this.personRepository.findOne({
      where: { id },
      relations: ["event"],
    });
  }

  async findByEvent(eventId: string): Promise<Person[]> {
    return this.personRepository.find({
      where: { eventId },
      order: { createdAt: "DESC" },
    });
  }

  async getAssignedQuestions(personId: string): Promise<any[]> {
    const person = await this.findOne(personId);
    if (!person || !person.assignedQuestionIds || !person.eventId) {
      return [];
    }

    const event = await this.eventRepository.findOne({
      where: { id: person.eventId },
    });
    if (!event || !event.questions) {
      return [];
    }

    return event.questions.filter((q) =>
      person.assignedQuestionIds.includes(q.id),
    );
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    await this.personRepository.update(id, updatePersonDto as any);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.personRepository.delete(id);
  }
}
