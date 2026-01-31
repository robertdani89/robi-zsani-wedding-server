import { Column, Entity, PrimaryColumn } from "typeorm";

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

  @Column({
    type: "text",
    enum: QuestionCategory,
  })
  category: QuestionCategory;

  @Column()
  text: string;

  @Column({
    type: "text",
    enum: QuestionType,
  })
  type: QuestionType;

  @Column("simple-json", { nullable: true })
  options: string[] | null;
}
