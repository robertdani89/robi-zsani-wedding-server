import { PersonRole } from "../person.entity";

export class CreatePersonDto {
  name: string;
  eventCode: string;
  role?: PersonRole;
  assignedQuestionIds?: string[];
}
