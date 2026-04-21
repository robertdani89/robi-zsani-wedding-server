import { Controller, Get, Query } from "@nestjs/common";

import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("person")
  getAllPersonsWithStats(@Query("eventId") eventId: string) {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    return this.adminService.getAllPersonsWithStats(eventId);
  }
}
