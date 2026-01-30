import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Photo } from "./photo.entity";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class PhotoService {
  private readonly uploadPath = path.join(process.cwd(), "uploads");

  constructor(
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
  ) {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async create(file: Express.Multer.File, guestId: string): Promise<Photo> {
    const photo = this.photoRepository.create({
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      guestId,
    });
    return this.photoRepository.save(photo);
  }

  async findAll(): Promise<Photo[]> {
    return this.photoRepository.find({ relations: ["guest"] });
  }

  async findByGuest(guestId: string): Promise<Photo[]> {
    return this.photoRepository.find({ where: { guestId } });
  }

  async findOne(id: string): Promise<Photo> {
    return this.photoRepository.findOne({
      where: { id },
      relations: ["guest"],
    });
  }

  async remove(id: string): Promise<void> {
    const photo = await this.findOne(id);
    if (photo && fs.existsSync(photo.path)) {
      fs.unlinkSync(photo.path);
    }
    await this.photoRepository.delete(id);
  }
}
