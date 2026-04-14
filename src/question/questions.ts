import { QuestionType } from "./question.entity";

export interface LocalizedText {
  en: string;
  hu: string;
}

export interface QuestionDefinition {
  id: string;
  text: LocalizedText;
  type: QuestionType;
  options?: LocalizedText[];
}

export const QUESTION_DEFINITIONS: QuestionDefinition[] = [
  {
    id: "q1",
    text: {
      en: "What kind of trip would you like to join us on?",
      hu: "Milyen kirándulásra jönnél velünk szívesen?",
    },
    type: QuestionType.MULTIPLE_CHOICE,
    options: [
      { en: "Beach", hu: "Strandolás" },
      { en: "Mountain retreat", hu: "Hegyi visszavonulás" },
      { en: "Biking tour", hu: "Biciklis túra" },
      { en: "Wine tasting tour", hu: "Borkóstoló kúra" },
    ],
  },
  {
    id: "q2",
    text: {
      en: "What kind of evening program would you like to join us for?",
      hu: "Milyen esti programra csatlakoznál hozzánk szívesen?",
    },
    type: QuestionType.MULTIPLE_CHOICE,
    options: [
      { en: "Board game night", hu: "Társasjáték est" },
      { en: "Movie night", hu: "Filmnézés" },
      { en: "Theater", hu: "Színház" },
      { en: "Concert", hu: "Koncert" },
    ],
  },
  {
    id: "q3",
    text: {
      en: "Would you guess a boy or a girl for our first baby?",
      hu: "Fiút vagy lányt tippelnél nekünk első babára?",
    },
    type: QuestionType.SINGLE_CHOICE,
    options: [
      { en: "Boy", hu: "Fiú" },
      { en: "Girl", hu: "Lány" },
      { en: "Stick with the dogs!", hu: "Maradjatok a kutyáknál!" },
    ],
  },
  {
    id: "q4",
    text: {
      en: "Share a piece of advice for marriage or parenthood!",
      hu: "Ossz meg velünk egy jó tanácsot a házassághoz vagy a szülői léthez!",
    },
    type: QuestionType.FREE_TEXT,
  },
];
