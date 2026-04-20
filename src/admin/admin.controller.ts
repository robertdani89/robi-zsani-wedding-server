import { Controller, Get, Query } from "@nestjs/common";

import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("guests")
  getAllPersonsWithStats(@Query("eventId") eventId?: string) {
    return this.adminService.getAllPersonsWithStats(eventId);
  }
}
