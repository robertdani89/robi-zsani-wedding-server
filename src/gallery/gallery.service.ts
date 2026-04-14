import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Photo } from "../photo/photo.entity";

export interface GalleryCollection {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  googlePhotosUrl?: string;
  photoCount?: number;
  hiddenFromGallery?: boolean;
}

export interface GalleryPhoto {
  id: string;
  collectionId: string;
  title?: string;
  thumbnailUrl: string;
  displayUrl: string;
  fullUrl?: string;
}

@Injectable()
export class GalleryService {
  private readonly mainCollectionId = "wedding-moments";
  private readonly hiddenPuzzleCollectionId = "our-little-pets";

  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
  ) {}

  private getPlaceholderPhotos(collectionId: string): GalleryPhoto[] {
    return Array.from({ length: 5 }, (_, index) => {
      const photoNumber = index + 1;
      const seed = `${collectionId}-${photoNumber}`;

      return {
        id: `${collectionId}-${photoNumber}`,
        collectionId,
        title: `Photo ${photoNumber}`,
        thumbnailUrl: `https://picsum.photos/seed/${seed}/240/180`,
        displayUrl: `https://picsum.photos/seed/${seed}/1400/1000`,
        fullUrl: `https://picsum.photos/seed/${seed}/2000/1400`,
      };
    });
  }

  private mapUploadedPhotos(baseUrl: string, photos: Photo[]): GalleryPhoto[] {
    return photos.map((photo) => ({
      id: photo.id,
      collectionId: this.mainCollectionId,
      title: photo.filename,
      thumbnailUrl: `${baseUrl}/photos/${photo.id}/thumbnail`,
      displayUrl: `${baseUrl}/photos/${photo.id}/file`,
      fullUrl: `${baseUrl}/photos/${photo.id}/file`,
    }));
  }

  async getCollections(baseUrl: string): Promise<GalleryCollection[]> {
    const uploadedPhotos = await this.photoRepository.find({
      order: { createdAt: "DESC" },
    });

    const mappedPhotos = this.mapUploadedPhotos(baseUrl, uploadedPhotos);
    const fallbackPhotos = this.getPlaceholderPhotos(this.mainCollectionId);
    const hiddenPhotos = this.getPlaceholderPhotos(
      this.hiddenPuzzleCollectionId,
    );

    return [
      {
        id: this.mainCollectionId,
        title: "Wedding moments",
        description: "Shared photos from our guests and the celebration.",
        thumbnailUrl:
          mappedPhotos[0]?.thumbnailUrl ?? fallbackPhotos[0]?.thumbnailUrl,
        photoCount: mappedPhotos.length || fallbackPhotos.length,
      },
      {
        id: this.hiddenPuzzleCollectionId,
        title: "Our little pets",
        description: "Hidden collection used by the puzzle view.",
        thumbnailUrl: hiddenPhotos[0]?.thumbnailUrl,
        photoCount: hiddenPhotos.length,
        hiddenFromGallery: true,
      },
    ];
  }

  async getCollectionPhotos(
    collectionId: string,
    baseUrl: string,
  ): Promise<GalleryPhoto[]> {
    if (collectionId === this.hiddenPuzzleCollectionId) {
      return this.getPlaceholderPhotos(collectionId);
    }

    const uploadedPhotos = await this.photoRepository.find({
      order: { createdAt: "DESC" },
    });

    if (uploadedPhotos.length === 0) {
      return this.getPlaceholderPhotos(collectionId || this.mainCollectionId);
    }

    return this.mapUploadedPhotos(baseUrl, uploadedPhotos).map((photo) => ({
      ...photo,
      collectionId,
    }));
  }
}
