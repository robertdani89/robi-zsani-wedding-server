import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Person } from "../person/person.entity";

@Entity()
export class Song {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  spotifyId: string;

  @Column()
  name: string;

  @Column()
  artist: string;

  @Column()
  album: string;

  @Column({ nullable: true })
  albumArt: string;

  @Column({ nullable: true })
  previewUrl: string;

  @ManyToOne(() => Person, { onDelete: "CASCADE" })
  person: Person;

  @Column()
  personId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true, type: "boolean" })
  allowed: boolean | null;

  @Column({ nullable: true, type: "datetime" })
  playedAt: Date | null;
}
