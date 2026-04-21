import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Person, PersonRole } from "../person/person.entity";
import { Answer } from "../answer/answer.entity";
import { Photo } from "../photo/photo.entity";
import { Song } from "../song/song.entity";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
  ) {}

  async getAllPersonsWithStats(eventId: string) {
    if (!eventId) {
      throw new Error("Event ID is required");
    }

    const where = {
      eventId,
      role: In([PersonRole.ASSISTANT, PersonRole.GUEST]),
    };
    const persons = await this.personRepository.find({
      where,
      order: { createdAt: "DESC" },
      relations: ["event"],
    });

    const personsWithStats = await Promise.all(
      persons.map(async (person) => {
        const answerCount = await this.answerRepository.count({
          where: { personId: person.id },
        });
        const photoCount = await this.photoRepository.count({
          where: { personId: person.id },
        });
        const songCount = await this.songRepository.count({
          where: { person: { id: person.id } },
        });

        return {
          id: person.id,
          name: person.name,
          role: person.role,
          eventId: person.eventId,
          eventName: person.event?.name ?? null,
          createdAt: person.createdAt,
          answerCount,
          photoCount,
          songCount,
        };
      }),
    );

    return personsWithStats;
  }
}
