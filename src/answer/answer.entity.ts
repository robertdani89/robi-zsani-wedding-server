import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Person } from "../person/person.entity";
import { Question } from "../question/question.entity";

@Entity()
export class Answer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Person, { onDelete: "CASCADE" })
  person: Person;

  @Column()
  personId: string;

  @ManyToOne(() => Question, { onDelete: "CASCADE" })
  question: Question;

  @Column()
  questionId: string;

  @Column("simple-json")
  value: string | string[];

  @CreateDateColumn()
  answeredAt: Date;
}
