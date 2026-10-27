import { Document } from 'mongoose';

export interface ITranslation extends Document {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  screen?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITranslateScreenPayload {
  screen?: string;
  targetLang: string;
  sourceLang?: string;
  texts?: string[];
  content?: Record<string, string>;
}

export interface ITranslatedResult {
  translations: Record<string, string>;
  screen?: string;
  targetLang: string;
  stats: {
    totalRequested: number;
    servedFromCache: number;
    fetchedFromApi: number;
  };
}
