import { ErrorReportModule } from "../error-report/error-report.module";
import { GiftController } from "./gift.controller";
import { GiftService } from "./gift.service";
import { GiftWsGateway } from "./gift-ws.gateway";
import { GuestModule } from "../guest/guest.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [GuestModule, ErrorReportModule],
  controllers: [GiftController],
  providers: [GiftService, GiftWsGateway],
  exports: [GiftService],
})
export class GiftModule {}
