import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { GalleryService } from "./gallery.service";

@Controller("gallery")
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  private getBaseUrl(req: Request): string {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol =
      typeof forwardedProto === "string"
        ? forwardedProto
        : req.protocol || "http";

    return `${protocol}://${req.get("host")}/api`;
  }

  @Get("collections")
  public getCollections(@Req() req: Request) {
    return this.galleryService.getCollections(this.getBaseUrl(req));
  }

  @Get("collections/:collectionId/photos")
  public getCollectionPhotos(
    @Param("collectionId") collectionId: string,
    @Req() req: Request,
  ) {
    return this.galleryService.getCollectionPhotos(
      collectionId,
      this.getBaseUrl(req),
    );
  }

  @Get("collections/:collectionId/photos/:photoId/file")
  public async getPhotoFile(
    @Param("collectionId") collectionId: string,
    @Param("photoId") photoId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.galleryService.getPhotoPath(
      collectionId,
      photoId,
      "file",
    );
    return res.sendFile(filePath);
  }

  @Get("collections/:collectionId/photos/:photoId/thumbnail")
  public async getPhotoThumbnail(
    @Param("collectionId") collectionId: string,
    @Param("photoId") photoId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.galleryService.getPhotoPath(
      collectionId,
      photoId,
      "thumbnail",
    );
    return res.sendFile(filePath);
  }
}
