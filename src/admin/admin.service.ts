import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Person } from "../person/person.entity";
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

  async getAllPersonsWithStats(eventId?: string) {
    const where = eventId ? { eventId } : {};
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
        const song = await this.songRepository.findOne({
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
          hasSong: !!song,
          songName: song?.name || null,
        };
      }),
    );

    return personsWithStats;
  }
}
