import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import { GuestService } from "./guest.service";
import { CreateGuestDto } from "./dto/create-guest.dto";
import { UpdateGuestDto } from "./dto/update-guest.dto";

@Controller("guests")
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Post()
  create(@Body() createGuestDto: CreateGuestDto) {
    return this.guestService.create(createGuestDto);
  }

  @Post("register")
  register(
    @Body() body: { name: string },
    @Query("questionCount") questionCount?: string,
  ) {
    const count = questionCount ? parseInt(questionCount, 10) : 8;
    return this.guestService.registerWithQuestions(body.name, count);
  }

  @Get()
  findAll() {
    return this.guestService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.guestService.findOne(id);
  }

  @Get(":id/questions")
  getAssignedQuestions(@Param("id") id: string) {
    return this.guestService.getAssignedQuestions(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateGuestDto: UpdateGuestDto) {
    return this.guestService.update(id, updateGuestDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.guestService.remove(id);
  }
}
