import { GiftController } from "./gift.controller";
import { GiftService } from "./gift.service";
import { GuestModule } from "../guest/guest.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [GuestModule],
  controllers: [GiftController],
  providers: [GiftService],
  exports: [GiftService],
})
export class GiftModule {}
