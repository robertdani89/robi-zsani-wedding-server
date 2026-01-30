import { CreateGuestDto } from "./create-guest.dto";
import { PartialType } from "@nestjs/mapped-types";

export class UpdateGuestDto extends PartialType(CreateGuestDto) {}
