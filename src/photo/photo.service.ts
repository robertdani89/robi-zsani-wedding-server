import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Photo } from "./photo.entity";
import * as fs from "fs";
import * as path from "path";
import * as sharp from "sharp";

@Injectable()
export class PhotoService {
  private readonly uploadPath = path.join(process.cwd(), "uploads");
  private readonly thumbnailPath = path.join(
    process.cwd(),
    "uploads",
    "thumbnails",
  );

  constructor(
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
  ) {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
    // Create thumbnails directory if it doesn't exist
    if (!fs.existsSync(this.thumbnailPath)) {
      fs.mkdirSync(this.thumbnailPath, { recursive: true });
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

    const savedPhoto = await this.photoRepository.save(photo);

    // Generate thumbnail asynchronously
    this.generateThumbnail(file.path, savedPhoto.id).catch((err) =>
      console.error("Error generating thumbnail:", err),
    );

    return savedPhoto;
  }

  private async generateThumbnail(
    originalPath: string,
    photoId: string,
  ): Promise<void> {
    const thumbnailFilePath = path.join(this.thumbnailPath, `${photoId}.jpg`);

    try {
      await sharp(originalPath)
        .resize(200, 200, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailFilePath);
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
    }
  }

  async getThumbnailPath(photoId: string): Promise<string | null> {
    const thumbnailFilePath = path.join(this.thumbnailPath, `${photoId}.jpg`);
    if (fs.existsSync(thumbnailFilePath)) {
      return thumbnailFilePath;
    }
    return null;
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
    if (photo) {
      // Remove original file
      if (fs.existsSync(photo.path)) {
        fs.unlinkSync(photo.path);
      }
      // Remove thumbnail
      const thumbnailFilePath = path.join(this.thumbnailPath, `${id}.jpg`);
      if (fs.existsSync(thumbnailFilePath)) {
        fs.unlinkSync(thumbnailFilePath);
      }
    }
    await this.photoRepository.delete(id);
  }
}
