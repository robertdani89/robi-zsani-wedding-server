import { Controller, Post, Get, Body } from "@nestjs/common";
import { GiftService, GiftType } from "./gift.service";
import { ErrorReportService } from "../error-report/error-report.service";

@Controller("gift")
export class GiftController {
  constructor(
    private readonly giftService: GiftService,
    private readonly errorReportService: ErrorReportService,
  ) {}

  @Post("open")
  async openGift(@Body() body: { guestId: string; giftType: GiftType }) {
    return this.giftService.triggerOpen(body.guestId, body.giftType);
  }

  @Get("status")
  getStatus() {
    return this.giftService.getStatus();
  }

  // Fallback endpoint — frontend tries /gift-assistance if guest-scoped route fails
  @Post("assistance")
  requestAssistance(@Body() body: { guestId?: string; message?: string }) {
    const who = body?.guestId ?? "unknown guest";
    const detail = body?.message ? ` – "${body.message}"` : "";
    this.errorReportService.addError(
      `Gift assistance requested by ${who}${detail}`,
    );
    return { status: "ok" };
  }
}
