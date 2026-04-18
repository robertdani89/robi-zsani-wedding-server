import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";

export interface ErrorEntry {
  timestamp: Date;
  type: "error" | "info";
  message: string;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const CHECKIN_TIMEOUT_MS = 60 * 1000;

@Injectable()
export class ErrorReportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErrorReportService.name);
  private entries: ErrorEntry[] = [];
  private giftServerDown = false;
  private watchdogTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.resetWatchdog();
    this.logger.log("Gift server watchdog started (60s timeout)");
  }

  onModuleDestroy() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
    }
  }

  checkIn() {
    if (this.giftServerDown) {
      this.giftServerDown = false;
      this.addEntry("info", "Gift server connection restored");
    }
    this.resetWatchdog();
  }

  addError(message: string) {
    this.addEntry("error", message);
  }

  getEntries(): ErrorEntry[] {
    this.purgeOld();
    return [...this.entries];
  }

  private addEntry(type: "error" | "info", message: string) {
    this.purgeOld();
    const entry: ErrorEntry = { timestamp: new Date(), type, message };
    this.entries.push(entry);
    if (type === "error") {
      this.logger.error(message);
    } else {
      this.logger.log(message);
    }
  }

  private purgeOld() {
    const cutoff = Date.now() - ONE_HOUR_MS;
    this.entries = this.entries.filter((e) => e.timestamp.getTime() > cutoff);
  }

  private resetWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
    }
    this.watchdogTimer = setTimeout(
      () => this.onWatchdogFired(),
      CHECKIN_TIMEOUT_MS,
    );
  }

  private onWatchdogFired() {
    this.giftServerDown = true;
    this.addEntry("error", "Gift server has not checked in for over a minute");
    this.resetWatchdog();
  }
}
