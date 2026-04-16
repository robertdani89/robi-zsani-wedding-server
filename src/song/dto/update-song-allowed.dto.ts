import { IsBoolean } from "class-validator";

export class UpdateSongAllowedDto {
  @IsBoolean()
  allowed: boolean;
}
