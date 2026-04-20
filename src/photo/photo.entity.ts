import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Person } from "../person/person.entity";

@Entity()
export class Photo {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  filename: string;

  @Column()
  path: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @ManyToOne(() => Person, { onDelete: "CASCADE" })
  person: Person;

  @Column()
  personId: string;

  @CreateDateColumn()
  createdAt: Date;
}
