import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import * as path from "path";
import { GalleryService } from "../gallery/gallery.service";
import { PhotoService } from "./photo.service";

@Controller("photos")
export class PhotoController {
  constructor(
    private readonly photoService: PhotoService,
    private readonly galleryService: GalleryService,
  ) {}

  private getBaseUrl(req: Request): string {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol =
      typeof forwardedProto === "string"
        ? forwardedProto
        : req.protocol || "http";

    return `${protocol}://${req.get("host")}/api`;
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("photo"))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body("guestId") guestId: string,
  ) {
    console.log("Upload request received, file:", file, "guestId:", guestId);
    if (!file) {
      throw new BadRequestException(
        "No file uploaded. Please provide an image file.",
      );
    }
    if (!guestId) {
      throw new BadRequestException("Guest ID is required");
    }
    return this.photoService.create(file, guestId);
  }

  @Post("upload-multiple")
  @UseInterceptors(FilesInterceptor("photos", 5))
  async uploadMultiplePhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("guestId") guestId: string,
  ) {
    if (!guestId) {
      throw new BadRequestException("Guest ID is required");
    }
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
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

  @Get("collections")
  getCollections(@Req() req: Request) {
    return this.galleryService.getCollections(this.getBaseUrl(req));
  }

  @Get("collections/:collectionId")
  getCollectionPhotos(
    @Param("collectionId") collectionId: string,
    @Req() req: Request,
  ) {
    return this.galleryService.getCollectionPhotos(
      collectionId,
      this.getBaseUrl(req),
    );
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
    return res.sendFile(path.resolve(photo.path));
  }

  @Get(":id/thumbnail")
  async getPhotoThumbnail(@Param("id") id: string, @Res() res: Response) {
    const photo = await this.photoService.findOne(id);
    if (!photo) {
      return res.status(404).send("Photo not found");
    }

    // Check if thumbnail exists, if not return original
    const thumbnailPath = await this.photoService.getThumbnailPath(id);
    if (thumbnailPath) {
      return res.sendFile(thumbnailPath);
    }

    // Fallback to original file
    return res.sendFile(path.resolve(photo.path));
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.photoService.remove(id);
  }
}
