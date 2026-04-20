import { ErrorReportModule } from "../error-report/error-report.module";
import { GiftController } from "./gift.controller";
import { GiftService } from "./gift.service";
import { GiftWsGateway } from "./gift-ws.gateway";
import { Module } from "@nestjs/common";
import { PersonModule } from "../person/person.module";

@Module({
  imports: [PersonModule, ErrorReportModule],
  controllers: [GiftController],
  providers: [GiftService, GiftWsGateway],
  exports: [GiftService],
})
export class GiftModule {}
