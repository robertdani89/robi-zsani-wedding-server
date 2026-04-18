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
      en: "What is the best marriage advice you can give?",
      hu: "Mi a legjobb házassági tanács, amit adhatnál?",
    },
    type: QuestionType.FREE_TEXT,
  },
  {
    id: "q5",
    text: {
      en: "What could the couple have a great argument about? (We couldn't come up with one)",
      hu: "Min veszekedhetne a mennyasszony és a vőlegény egy jót? (mi nem jöttünk rá)",
    },
    type: QuestionType.FREE_TEXT,
  },
  {
    id: "q6",
    text: {
      en: "What nickname would you give to the couple?",
      hu: "Milyen becenevet adnál a párnak?",
    },
    type: QuestionType.FREE_TEXT,
  },
  {
    id: "q7",
    text: {
      en: "Where should we celebrate our 1st anniversary?",
      hu: "Hol ünnepeljük az 1. évfordulónkat?",
    },
    type: QuestionType.FREE_TEXT,
  },
  {
    id: "q8",
    text: {
      en: "What is your best advice for us as parents?",
      hu: "Mi a legjobb tanácsod számunkra szülőként?",
    },
    type: QuestionType.FREE_TEXT,
  },
  {
    id: "q9",
    text: {
      en: "What should we do during our first year as a married couple?",
      hu: "Hogy töltsük az első évünket házaspárként?",
    },
    type: QuestionType.FREE_TEXT,
  },
  {
    id: "q10",
    text: {
      en: "What is the most romantic place you've been to that we should visit?",
      hu: "Mi a legromantikusabb hely, ahol jártál, amit nekünk is érdemes lenne meglátogatni?",
    },
    type: QuestionType.FREE_TEXT,
  },
  {
    id: "q11",
    text: {
      en: "What should we do every day as a married couple?",
      hu: "Mit tegyünk minden nap házaspárként?",
    },
    type: QuestionType.FREE_TEXT,
  },
];
