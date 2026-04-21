import {
  Patch,
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
import { UpdateSongAllowedDto } from "./dto/update-song-allowed.dto";

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

  @Get("next-pending")
  async findNextPending(@Query("eventId") eventId: string) {
    return this.songService.findNextPending(eventId);
  }

  @Get("persons/:personId")
  async findByPerson(@Param("personId") personId: string) {
    return this.songService.findByPerson(personId);
  }

  @Patch(":id/allowed")
  async updateAllowed(
    @Param("id") id: string,
    @Body() updateSongAllowedDto: UpdateSongAllowedDto,
  ) {
    return this.songService.updateAllowed(id, updateSongAllowedDto.allowed);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.songService.remove(id);
  }
}
