import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Person } from "../person/person.entity";

@Entity()
export class Answer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Person, { onDelete: "CASCADE" })
  person: Person;

  @Column()
  personId: string;

  @Column()
  questionId: string;

  @Column("simple-json")
  value: string | string[];

  @CreateDateColumn()
  answeredAt: Date;
}
