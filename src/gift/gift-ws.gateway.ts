import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import { ErrorReportService } from "../error-report/error-report.service";
import { Logger } from "@nestjs/common";
import { Server } from "ws";
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";

interface OpenResultMsg {
  type: "open_result";
  id: string;
  status: string;
  message?: string;
}

@WebSocketGateway({ path: "/gift-ws" })
export class GiftWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(GiftWsGateway.name);
  private giftSocket: WebSocket | null = null;
  private pendingRequests = new Map<string, (result: OpenResultMsg) => void>();

  constructor(private readonly errorReportService: ErrorReportService) {}

  handleConnection(client: WebSocket) {
    this.logger.log("Gift server connected via WebSocket");
    this.giftSocket = client;

    client.on("message", (raw: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.logger.warn("Received invalid JSON from gift server");
        return;
      }

      switch (msg.type) {
        case "checkin":
          this.errorReportService.checkIn();
          break;

        case "open_result": {
          const resolver = this.pendingRequests.get(msg.id);
          if (resolver) {
            this.pendingRequests.delete(msg.id);
            resolver(msg as OpenResultMsg);
          }
          break;
        }

        default:
          this.logger.warn(`Unknown message type: ${msg.type}`);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.logger.warn("Gift server WebSocket disconnected");
    if (this.giftSocket === client) {
      this.giftSocket = null;
    }
  }

  async sendOpen(
    gender: "man" | "woman",
  ): Promise<{ status: string; message?: string }> {
    if (!this.giftSocket || !this.isConnected()) {
      return { status: "error", message: "Gift server not connected" };
    }

    const id = uuidv4();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        resolve({ status: "error", message: "Gift server timed out" });
      }, 30_000);

      this.pendingRequests.set(id, (result) => {
        clearTimeout(timeout);
        resolve({ status: result.status, message: result.message });
      });

      this.giftSocket!.send(JSON.stringify({ type: "open", id, gender }));
    });
  }

  isConnected(): boolean {
    return this.giftSocket?.readyState === 1; // WebSocket.OPEN
  }
}
