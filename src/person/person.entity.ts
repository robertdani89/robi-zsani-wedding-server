import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Event } from "../event/event.entity";

export enum PersonRole {
  ORGANIZER = "organizer",
  ASSISTANT = "assistant",
  GUEST = "guest",
}

@Entity()
export class Person {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({
    type: "text",
    default: PersonRole.GUEST,
  })
  role: PersonRole;

  @Column({ default: false })
  completed: boolean;

  @Column("simple-json", { nullable: true })
  assignedQuestionIds: string[] | null;

  @ManyToOne(() => Event, { onDelete: "CASCADE", nullable: true })
  event: Event;

  @Column({ nullable: true })
  eventId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "datetime", nullable: true })
  gotGiftAt: Date | null;

  @Column({ nullable: true })
  typeOfGift: string | null;
}
