import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { GuestService } from "../guest/guest.service";

export type GiftType = "gift_for_man" | "gift_for_ladies";

@Injectable()
export class GiftService {
  private readonly logger = new Logger(GiftService.name);
  private readonly giftServerUrl: string;

  constructor(
    private configService: ConfigService,
    private guestService: GuestService,
  ) {
    this.giftServerUrl =
      this.configService.get<string>("GIFT_SERVER_URL") ||
      "http://localhost:3001";
  }

  async triggerOpen(
    guestId: string,
    giftType: GiftType,
  ): Promise<{ status: string; message?: string }> {
    try {
      this.logger.log(
        `Sending open command to gift server at ${this.giftServerUrl}`,
      );
      const response = await fetch(`${this.giftServerUrl}/open`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        this.logger.warn(
          `Gift server responded with ${response.status}: ${data.message}`,
        );
        return {
          status: "error",
          message: data.message || "Gift server error",
        };
      }

      this.logger.log("Gift sequence triggered successfully");
      await this.guestService.update(guestId, {
        gotGiftAt: new Date(),
        typeOfGift: giftType,
      });
      return { status: "ok" };
    } catch (error: any) {
      this.logger.error(`Failed to reach gift server: ${error.message}`);
      return { status: "error", message: "Gift server unreachable" };
    }
  }

  async getStatus(): Promise<{
    status: string;
    gpio?: boolean;
    busy?: boolean;
  }> {
    try {
      const response = await fetch(`${this.giftServerUrl}/health`);
      return await response.json();
    } catch {
      return { status: "unreachable" };
    }
  }
}
