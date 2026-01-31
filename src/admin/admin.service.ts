import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Guest } from "../guest/guest.entity";
import { Answer } from "../answer/answer.entity";
import { Photo } from "../photo/photo.entity";
import { Song } from "../song/song.entity";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Guest)
    private guestRepository: Repository<Guest>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
  ) {}

  async getAllGuestsWithStats() {
    const guests = await this.guestRepository.find({
      order: { createdAt: "DESC" },
    });

    const guestsWithStats = await Promise.all(
      guests.map(async (guest) => {
        const answerCount = await this.answerRepository.count({
          where: { guestId: guest.id },
        });
        const photoCount = await this.photoRepository.count({
          where: { guestId: guest.id },
        });
        const song = await this.songRepository.findOne({
          where: { guest: { id: guest.id } },
        });

        return {
          id: guest.id,
          name: guest.name,
          createdAt: guest.createdAt,
          answerCount,
          photoCount,
          hasSong: !!song,
          songName: song?.name || null,
        };
      }),
    );

    return guestsWithStats;
  }
}
