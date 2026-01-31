import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Guest } from "../guest/guest.entity";

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

  @ManyToOne(() => Guest, { onDelete: "CASCADE" })
  guest: Guest;

  @CreateDateColumn()
  createdAt: Date;
}
