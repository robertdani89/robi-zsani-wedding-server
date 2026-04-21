import { Controller, Get, Post, Body } from "@nestjs/common";
import {
  ErrorReportService,
  ErrorEntry,
} from "./error-report/error-report.service";

@Controller("")
export class AppController {
  constructor(private readonly errorReportService: ErrorReportService) {}

  @Get()
  getStatus(): string {
    return "Server is running";
  }

  @Get("errors")
  getErrors(): ErrorEntry[] {
    return this.errorReportService.getEntries();
  }

  // Frontend fallback: POST /gift-assistance
  @Post("gift-assistance")
  giftAssistanceFallback(
    @Body() body: { personId?: string; message?: string },
  ) {
    const who = body?.personId ?? "unknown guest";
    const detail = body?.message ? ` – "${body.message}"` : "";
    this.errorReportService.addError(
      `Gift assistance requested by ${who}${detail}`,
    );
    return { status: "ok" };
  }

  // Frontend fallback: POST /assistance-requests
  @Post("assistance-requests")
  assistanceRequestsFallback(
    @Body() body: { personId?: string; message?: string },
  ) {
    const who = body?.personId ?? "unknown guest";
    const detail = body?.message ? ` – "${body.message}"` : "";
    this.errorReportService.addError(
      `Gift assistance requested by ${who}${detail}`,
    );
    return { status: "ok" };
  }
}
