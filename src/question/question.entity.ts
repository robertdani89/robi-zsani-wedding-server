import { Column, Entity, PrimaryColumn } from "typeorm";

import type { LocalizedText } from "./questions";

export enum QuestionType {
  SINGLE_CHOICE = "single_choice",
  MULTIPLE_CHOICE = "multiple_choice",
  FREE_TEXT = "free_text",
}

export enum QuestionCategory {
  TRAVEL = "Travel & Vacation",
  ACTIVITIES = "Activities & Hobbies",
  FUN = "Fun / Personal",
}

@Entity()
export class Question {
  @PrimaryColumn()
  id: string;

  @Column("simple-json")
  text: LocalizedText;

  @Column({
    type: "text",
    enum: QuestionType,
  })
  type: QuestionType;

  @Column("simple-json", { nullable: true })
  options?: LocalizedText[] | null;
}
