import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Question, QuestionType } from "./question.entity";

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Milyen kirándulásra jönnél velünk szívesen?",
    type: QuestionType.MULTIPLE_CHOICE,
    options: [
      "Strandolás",
      "Hegyi visszavonulás",
      "Biciklis túra",
      "Borkóstoló kúra",
    ],
  },
  {
    id: "q2",
    text: "Milyen esti programra csatlakoznál hozzánk szívesen?",
    type: QuestionType.MULTIPLE_CHOICE,
    options: ["Társasjáték est", "Filmnézés", "Színház", "Koncert"],
  },
  {
    id: "q3",
    text: "Fiút vagy lányt tippelnél nekünk első babára?",
    type: QuestionType.SINGLE_CHOICE,
    options: ["Fiú", "Lány", "Maradjatok a kutyáknál!"],
  },

  {
    id: "q4",
    text: "Ossz meg velünk egy jó tanácsot a házassághoz vagy a szülői léthez!",
    type: QuestionType.FREE_TEXT,
  },
];

@Injectable()
export class QuestionService implements OnModuleInit {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async onModuleInit() {
    await this.seedQuestions();
  }

  private async seedQuestions() {
    const count = await this.questionRepository.count();
    if (count === 0) {
      for (const question of QUESTIONS) {
        await this.questionRepository.save(question);
      }
    }
  }

  async findAll(): Promise<Question[]> {
    return this.questionRepository.find();
  }

  async findOne(id: string): Promise<Question> {
    return this.questionRepository.findOne({ where: { id } });
  }

  async getRandomQuestions(count: number = 8): Promise<Question[]> {
    const allQuestions = await this.findAll();
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
