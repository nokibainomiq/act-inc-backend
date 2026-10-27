import { Schema, model } from 'mongoose';
import { ITranslation } from './translation.interface';

const translationSchema = new Schema<ITranslation>(
  {
    sourceText: {
      type: String,
      required: true,
      trim: true,
    },
    sourceLang: {
      type: String,
      default: 'en',
    },
    targetLang: {
      type: String,
      required: true,
      trim: true,
    },
    translatedText: {
      type: String,
      required: true,
    },
    screen: {
      type: String,
      default: 'general',
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for instant O(1) cache lookup
translationSchema.index({ sourceText: 1, targetLang: 1 }, { unique: true });

export const Translation = model<ITranslation>('Translation', translationSchema);
