import { CreatePersonDto } from "./create-person.dto";
import { PartialType } from "@nestjs/mapped-types";

export class UpdatePersonDto extends PartialType(CreatePersonDto) {
  gotGiftAt?: Date;
  typeOfGift?: string;
}
