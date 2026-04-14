import { Injectable, NotFoundException } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import * as sharp from "sharp";

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

interface CachedGallery {
  id: string;
  title: string;
  description?: string;
  googlePhotosUrl?: string;
  hiddenFromGallery?: boolean;
  photoFiles: string[];
}

@Injectable()
export class GalleryService {
  private readonly galleryRoot = path.join(process.cwd(), "gallery");
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private galleryCache: CachedGallery[] | null = null;
  private cacheLoadedAt = 0;
  private loadingPromise: Promise<CachedGallery[]> | null = null;

  private isImageFile(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(
      extension,
    );
  }

  private async readOptionalTextFile(
    filePath: string,
  ): Promise<string | undefined> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const trimmed = content.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    } catch {
      return undefined;
    }
  }

  private async ensureThumbnailExists(
    collectionPath: string,
    fileName: string,
  ): Promise<void> {
    const thumbnailDirectory = path.join(collectionPath, "thumbnails");
    const originalPath = path.join(collectionPath, fileName);
    const thumbnailPath = path.join(thumbnailDirectory, fileName);

    await fs.mkdir(thumbnailDirectory, { recursive: true });

    try {
      await fs.access(thumbnailPath);
      return;
    } catch {
      // Thumbnail does not exist yet, so create it.
    }

    try {
      await sharp(originalPath)
        .resize(200, 200, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${originalPath}:`, error);
    }
  }

  private async loadGalleriesFromDisk(): Promise<CachedGallery[]> {
    try {
      const rootEntries = await fs.readdir(this.galleryRoot, {
        withFileTypes: true,
      });

      const collections = await Promise.all(
        rootEntries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            const collectionPath = path.join(this.galleryRoot, entry.name);
            const files = await fs.readdir(collectionPath, {
              withFileTypes: true,
            });
            const photoFiles = files
              .filter((file) => file.isFile() && this.isImageFile(file.name))
              .map((file) => file.name)
              .sort((left, right) =>
                left.localeCompare(right, undefined, {
                  numeric: true,
                  sensitivity: "base",
                }),
              );

            await Promise.all(
              photoFiles.map((fileName) =>
                this.ensureThumbnailExists(collectionPath, fileName),
              ),
            );

            const title =
              (await this.readOptionalTextFile(
                path.join(collectionPath, "title"),
              )) ?? entry.name;
            const description = await this.readOptionalTextFile(
              path.join(collectionPath, "description"),
            );
            const googlePhotosUrl = await this.readOptionalTextFile(
              path.join(collectionPath, "googlePhotosUrl"),
            );
            const hiddenFromGallery =
              (await this.readOptionalTextFile(
                path.join(collectionPath, "hidden"),
              )) === "true";

            return {
              id: entry.name,
              title,
              description,
              googlePhotosUrl,
              hiddenFromGallery,
              photoFiles,
            } satisfies CachedGallery;
          }),
      );

      return collections.sort((left, right) =>
        left.title.localeCompare(right.title),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  private async getCachedGalleries(): Promise<CachedGallery[]> {
    const isCacheValid =
      this.galleryCache !== null &&
      Date.now() - this.cacheLoadedAt < this.cacheTtlMs;

    if (isCacheValid) {
      return this.galleryCache;
    }

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadGalleriesFromDisk()
        .then((collections) => {
          this.galleryCache = collections;
          this.cacheLoadedAt = Date.now();
          return collections;
        })
        .finally(() => {
          this.loadingPromise = null;
        });
    }

    return this.loadingPromise;
  }

  private buildPhotoUrl(
    baseUrl: string,
    collectionId: string,
    fileName: string,
    variant: "file" | "thumbnail",
  ): string {
    return `${baseUrl}/gallery/collections/${encodeURIComponent(collectionId)}/photos/${encodeURIComponent(fileName)}/${variant}`;
  }

  async getCollections(baseUrl: string): Promise<GalleryCollection[]> {
    const collections = await this.getCachedGalleries();

    return collections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      description: collection.description,
      googlePhotosUrl: collection.googlePhotosUrl,
      photoCount: collection.photoFiles.length,
      hiddenFromGallery: collection.hiddenFromGallery,
      thumbnailUrl:
        collection.photoFiles.length > 0
          ? this.buildPhotoUrl(
              baseUrl,
              collection.id,
              collection.photoFiles[0],
              "thumbnail",
            )
          : undefined,
    }));
  }

  async getCollectionPhotos(
    collectionId: string,
    baseUrl: string,
  ): Promise<GalleryPhoto[]> {
    const collections = await this.getCachedGalleries();
    const collection = collections.find((item) => item.id === collectionId);

    if (!collection) {
      return [];
    }

    return collection.photoFiles.map((fileName) => ({
      id: fileName,
      collectionId,
      title: path.parse(fileName).name,
      thumbnailUrl: this.buildPhotoUrl(
        baseUrl,
        collectionId,
        fileName,
        "thumbnail",
      ),
      displayUrl: this.buildPhotoUrl(baseUrl, collectionId, fileName, "file"),
      fullUrl: this.buildPhotoUrl(baseUrl, collectionId, fileName, "file"),
    }));
  }

  async getPhotoPath(
    collectionId: string,
    photoId: string,
    variant: "file" | "thumbnail" = "file",
  ): Promise<string> {
    const collections = await this.getCachedGalleries();
    const collection = collections.find((item) => item.id === collectionId);

    if (!collection || !collection.photoFiles.includes(photoId)) {
      throw new NotFoundException("Photo not found");
    }

    const collectionPath = path.join(this.galleryRoot, collectionId);
    const filePath =
      variant === "thumbnail"
        ? path.join(collectionPath, "thumbnails", photoId)
        : path.join(collectionPath, photoId);

    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      if (variant === "thumbnail") {
        await this.ensureThumbnailExists(collectionPath, photoId);
        return path.join(collectionPath, "thumbnails", photoId);
      }

      throw new NotFoundException("Photo file not found");
    }
  }
}
