import { Global, Module } from "@nestjs/common";
import { ErrorReportService } from "./error-report.service";

@Global()
@Module({
  providers: [ErrorReportService],
  exports: [ErrorReportService],
})
export class ErrorReportModule {}
