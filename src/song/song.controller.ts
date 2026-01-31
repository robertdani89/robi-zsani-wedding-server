import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { SongService } from "./song.service";
import { CreateSongDto } from "./dto/create-song.dto";

@Controller("songs")
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Get("search")
  async search(@Query("q") query: string) {
    return this.songService.searchSongs(query);
  }

  @Post()
  async create(@Body() createSongDto: CreateSongDto) {
    return this.songService.create(createSongDto);
  }

  @Get()
  async findAll() {
    return this.songService.findAll();
  }

  @Get("guest/:guestId")
  async findByGuest(@Param("guestId") guestId: string) {
    return this.songService.findByGuest(guestId);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.songService.remove(id);
  }
}
