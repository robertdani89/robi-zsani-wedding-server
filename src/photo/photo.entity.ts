import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Guest } from "../guest/guest.entity";

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

  @ManyToOne(() => Guest, { onDelete: "CASCADE" })
  guest: Guest;

  @Column()
  guestId: string;

  @CreateDateColumn()
  createdAt: Date;
}
