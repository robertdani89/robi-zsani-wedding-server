import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import { GuestService } from "./guest.service";
import { CreateGuestDto } from "./dto/create-guest.dto";
import { UpdateGuestDto } from "./dto/update-guest.dto";
import { ErrorReportService } from "../error-report/error-report.service";

@Controller("guests")
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly errorReportService: ErrorReportService,
  ) {}

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

  @Put(":id")
  replace(@Param("id") id: string, @Body() updateGuestDto: UpdateGuestDto) {
    return this.guestService.update(id, updateGuestDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.guestService.remove(id);
  }

  @Post(":id/gift-assistance")
  async requestGiftAssistance(
    @Param("id") id: string,
    @Body() body: { message?: string },
  ) {
    const guest = await this.guestService.findOne(id).catch(() => null);
    const name = guest?.name ?? id;
    const detail = body?.message ? ` – "${body.message}"` : "";
    this.errorReportService.addError(
      `Gift assistance requested by ${name}${detail}`,
    );
    return { status: "ok" };
  }

  @Post(":id/assistance")
  async requestAssistanceAlias(
    @Param("id") id: string,
    @Body() body: { message?: string },
  ) {
    return this.requestGiftAssistance(id, body);
  }

  @Post(":id/assistance-request")
  async requestAssistanceRequestAlias(
    @Param("id") id: string,
    @Body() body: { message?: string },
  ) {
    return this.requestGiftAssistance(id, body);
  }
}
