import { Injectable, Logger } from "@nestjs/common";
import { GuestService } from "../guest/guest.service";
import { GiftWsGateway } from "./gift-ws.gateway";

export type GiftType = "gift_for_man" | "gift_for_ladies";

@Injectable()
export class GiftService {
  private readonly logger = new Logger(GiftService.name);

  constructor(
    private guestService: GuestService,
    private giftWsGateway: GiftWsGateway,
  ) {}

  async triggerOpen(
    guestId: string,
    giftType: GiftType,
  ): Promise<{ status: string; message?: string }> {
    const gender = giftType === "gift_for_man" ? "man" : "woman";
    this.logger.log(`Sending open command via WebSocket for: ${gender}`);

    const result = await this.giftWsGateway.sendOpen(gender);

    if (result.status !== "done") {
      this.logger.warn(`Gift server responded: ${result.status} – ${result.message}`);
      return { status: "error", message: result.message || "Gift server error" };
    }

    this.logger.log("Gift sequence triggered successfully");
    await this.guestService.update(guestId, {
      gotGiftAt: new Date(),
      typeOfGift: giftType,
    });
    return { status: "ok" };
  }

  getStatus(): { status: string; connected: boolean } {
    return {
      status: "ok",
      connected: this.giftWsGateway.isConnected(),
    };
  }
}
