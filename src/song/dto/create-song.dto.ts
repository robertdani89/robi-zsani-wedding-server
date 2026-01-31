import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSongDto {
  @IsNotEmpty()
  @IsString()
  spotifyId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  artist: string;

  @IsNotEmpty()
  @IsString()
  album: string;

  @IsOptional()
  @IsString()
  albumArt?: string;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsNotEmpty()
  @IsString()
  guestId: string;
}
