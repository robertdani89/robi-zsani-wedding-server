import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  Res,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { PhotoService } from "./photo.service";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import { Response } from "express";

@Controller("photos")
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(new BadRequestException("Only image files are allowed"), false);
        } else {
          cb(null, true);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body("guestId") guestId: string,
  ) {
    if (!guestId) {
      throw new BadRequestException("Guest ID is required");
    }
    return this.photoService.create(file, guestId);
  }

  @Post("upload-multiple")
  @UseInterceptors(
    FilesInterceptor("photos", 5, {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(new BadRequestException("Only image files are allowed"), false);
        } else {
          cb(null, true);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
      },
    }),
  )
  async uploadMultiplePhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("guestId") guestId: string,
  ) {
    if (!guestId) {
      throw new BadRequestException("Guest ID is required");
    }
    const photos = await Promise.all(
      files.map((file) => this.photoService.create(file, guestId)),
    );
    return photos;
  }

  @Get()
  findAll() {
    return this.photoService.findAll();
  }

  @Get("guest/:guestId")
  findByGuest(@Param("guestId") guestId: string) {
    return this.photoService.findByGuest(guestId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.photoService.findOne(id);
  }

  @Get(":id/file")
  async getPhotoFile(@Param("id") id: string, @Res() res: Response) {
    const photo = await this.photoService.findOne(id);
    if (!photo) {
      return res.status(404).send("Photo not found");
    }
    return res.sendFile(photo.path, { root: "." });
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.photoService.remove(id);
  }
}
