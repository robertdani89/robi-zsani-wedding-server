import { EventQuestion } from "../event.entity";

export class CreateEventDto {
  code: string;
  name: string;
  date?: string;
  organizerName?: string;
  questions?: EventQuestion[];
}
