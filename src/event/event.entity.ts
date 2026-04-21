import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export interface LocalizedText {
  en: string;
  hu: string;
}

export enum QuestionType {
  SINGLE_CHOICE = "single_choice",
  MULTIPLE_CHOICE = "multiple_choice",
  FREE_TEXT = "free_text",
}

export interface EventQuestion {
  id: string;
  text: LocalizedText;
  type: QuestionType;
  options?: LocalizedText[];
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column("integer", { nullable: true })
  date: number;

  @Column("simple-json", { nullable: true })
  questions: EventQuestion[];

  @CreateDateColumn()
  createdAt: Date;
}
