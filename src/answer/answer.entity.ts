import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Guest } from "../guest/guest.entity";
import { Question } from "../question/question.entity";

@Entity()
export class Answer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Guest, { onDelete: "CASCADE" })
  guest: Guest;

  @Column()
  guestId: string;

  @ManyToOne(() => Question, { onDelete: "CASCADE" })
  question: Question;

  @Column()
  questionId: string;

  @Column("simple-json")
  value: string | string[];

  @CreateDateColumn()
  answeredAt: Date;
}
