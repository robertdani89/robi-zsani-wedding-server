import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class Guest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ default: false })
  completed: boolean;

  @Column("simple-json", { nullable: true })
  assignedQuestionIds: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "datetime", nullable: true })
  gotGiftAt: Date | null;

  @Column({ nullable: true })
  typeOfGift: string | null;
}
