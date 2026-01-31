export class CreateGuestDto {
  name: string;
  email?: string;
  phone?: string;
  assignedQuestionIds?: string[];
}
