import { Controller, Get } from "@nestjs/common";

@Controller("")
export class AppController {
  constructor() {

  }

  @Get()
  getStatus(): string {
    return "Server is running";
  }

}