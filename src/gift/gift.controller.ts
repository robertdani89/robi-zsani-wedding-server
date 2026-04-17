import { Controller, Post, Get, Body } from "@nestjs/common";
import { GiftService, GiftType } from "./gift.service";

@Controller("gift")
export class GiftController {
  constructor(private readonly giftService: GiftService) {}

  @Post("open")
  async openGift(@Body() body: { guestId: string; giftType: GiftType }) {
    return this.giftService.triggerOpen(body.guestId, body.giftType);
  }

  @Get("status")
  async getStatus() {
    return this.giftService.getStatus();
  }
}
