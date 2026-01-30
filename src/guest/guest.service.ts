import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Guest } from "./guest.entity";
import { CreateGuestDto } from "./dto/create-guest.dto";
import { UpdateGuestDto } from "./dto/update-guest.dto";

@Injectable()
export class GuestService {
  constructor(
    @InjectRepository(Guest)
    private guestRepository: Repository<Guest>,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    const guest = this.guestRepository.create(createGuestDto);
    return this.guestRepository.save(guest);
  }

  async findAll(): Promise<Guest[]> {
    return this.guestRepository.find();
  }

  async findOne(id: string): Promise<Guest> {
    return this.guestRepository.findOne({ where: { id } });
  }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<Guest> {
    await this.guestRepository.update(id, updateGuestDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.guestRepository.delete(id);
  }
}
