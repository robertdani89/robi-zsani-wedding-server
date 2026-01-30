export class CreateGuestDto {
  name: string;
  email?: string;
  phone?: string;
  answers: Record<string, any>;
}
