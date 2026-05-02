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
import { PersonService } from "./person.service";
import { CreatePersonDto } from "./dto/create-person.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { PersonRole } from "./person.entity";
import { ErrorReportService } from "../error-report/error-report.service";

const ASSISTANT_NAMES = new Set(["mokamiki"]);

@Controller("persons")
export class PersonController {
  constructor(
    private readonly personService: PersonService,
    private readonly errorReportService: ErrorReportService,
  ) {}

  @Post()
  create(@Body() createPersonDto: CreatePersonDto) {
    return this.personService.create(createPersonDto);
  }

  @Post("register")
  register(
    @Body()
    body: {
      name: string;
      eventCode: string;
      role?: PersonRole;
    },
    @Query("questionCount") questionCount?: string,
  ) {
    const normalizedName = body.name.trim().toLowerCase();
    const role = ASSISTANT_NAMES.has(normalizedName)
      ? PersonRole.ASSISTANT
      : body.role ?? PersonRole.GUEST;
    return this.personService.registerWithQuestions(
      body.name,
      body.eventCode,
      role,
    );
  }

  @Get()
  findAll() {
    return this.personService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.personService.findOne(id);
  }

  @Get(":id/questions")
  getAssignedQuestions(@Param("id") id: string) {
    return this.personService.getAssignedQuestions(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updatePersonDto: UpdatePersonDto) {
    return this.personService.update(id, updatePersonDto);
  }

  @Put(":id")
  replace(@Param("id") id: string, @Body() updatePersonDto: UpdatePersonDto) {
    return this.personService.update(id, updatePersonDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.personService.remove(id);
  }

  @Post(":id/gift-assistance")
  async requestGiftAssistance(
    @Param("id") id: string,
    @Body() body: { message?: string },
  ) {
    const person = await this.personService.findOne(id).catch(() => null);
    const name = person?.name ?? id;
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
