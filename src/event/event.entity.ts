import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import type { LocalizedText } from "../question/questions";
import { QuestionType } from "../question/question.entity";

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

  @Column({ nullable: true })
  date: string;

  @Column({ nullable: true })
  organizerName: string;

  @Column("simple-json", { nullable: true })
  questions: EventQuestion[];

  @CreateDateColumn()
  createdAt: Date;
}
