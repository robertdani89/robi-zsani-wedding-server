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

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: false })
  completed: boolean;

  @Column("simple-json", { nullable: true })
  assignedQuestionIds: string[];

  @CreateDateColumn()
  createdAt: Date;
}
