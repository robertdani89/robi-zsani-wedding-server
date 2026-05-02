import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from "@nestjs/common";
import { EventService } from "./event.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventQuestion } from "./event.entity";

@Controller("events")
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  // @Get()
  // findAll() {
  //   return this.eventService.findAll();
  // }

  @Get("code/:code")
  async findByCode(@Param("code") code: string) {
    const event = await this.eventService.findByCode(code);
    if (!event) {
      throw new NotFoundException(`Event with code "${code}" not found`);
    }

    delete event.questions;

    return event;
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const event = await this.eventService.findOne(id);
    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }

    delete event.questions;

    return event;
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(id, updateEventDto);
  }

  @Patch("code/:code/questions")
  updateQuestions(
    @Param("code") code: string,
    @Body() body: { questions: EventQuestion[] },
  ) {
    return this.eventService.updateQuestions(code, body.questions);
  }

  @Get("code/:code/questions")
  async getQuestions(@Param("code") code: string) {
    const event = await this.eventService.findByCode(code);
    if (!event) {
      throw new NotFoundException(`Event with code "${code}" not found`);
    }
    return event.questions ?? [];
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.eventService.remove(id);
  }
}
