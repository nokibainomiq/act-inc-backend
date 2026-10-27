import httpStatus from 'http-status';
import config from '../../config';
import AppError from '../../errors/AppError';
import { ITranslateScreenPayload, ITranslatedResult } from './translation.interface';
import { Translation } from './translation.model';

const callGoogleTranslateApi = async (
  texts: string[],
  targetLang: string,
  sourceLang?: string
): Promise<string[]> => {
  if (!config.google_translate_api_key) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Google Translate API key is not configured in backend .env'
    );
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${config.google_translate_api_key}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: texts,
        target: targetLang,
        ...(sourceLang && { source: sourceLang }),
        format: 'text',
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.data?.translations) {
    const errorMsg = data?.error?.message || 'Failed to fetch translations from Google Translate';
    throw new AppError(httpStatus.BAD_GATEWAY, `Google Translate API error: ${errorMsg}`);
  }

  return data.data.translations.map((item: { translatedText: string }) => item.translatedText);
};

const translateScreenTexts = async (
  payload: ITranslateScreenPayload
): Promise<ITranslatedResult> => {
  const { screen = 'general', targetLang, sourceLang = 'en', texts = [], content = {} } = payload;

  if (!targetLang) {
    throw new AppError(httpStatus.BAD_REQUEST, 'targetLang is required');
  }

  // Collect all unique strings from both 'texts' array and 'content' key-value pairs
  const stringSet = new Set<string>();

  texts.forEach((text) => {
    if (typeof text === 'string' && text.trim().length > 0) {
      stringSet.add(text.trim());
    }
  });

  Object.values(content).forEach((val) => {
    if (typeof val === 'string' && val.trim().length > 0) {
      stringSet.add(val.trim());
    }
  });

  const uniqueStrings = Array.from(stringSet);

  // Text already in the target language comes back as-is. Sending it to
  // Google anyway can drop or mangle words, and the cache would keep that.
  if (sourceLang === targetLang) {
    const finalTranslations: Record<string, string> = {};
    if (Object.keys(content).length > 0) {
      Object.entries(content).forEach(([key, val]) => {
        finalTranslations[key] = val;
      });
    } else {
      uniqueStrings.forEach((str) => {
        finalTranslations[str] = str;
      });
    }

    return {
      translations: finalTranslations,
      screen,
      targetLang,
      stats: {
        totalRequested: uniqueStrings.length,
        servedFromCache: 0,
        fetchedFromApi: 0,
      },
    };
  }

  if (uniqueStrings.length === 0) {
    return {
      translations: {},
      screen,
      targetLang,
      stats: {
        totalRequested: 0,
        servedFromCache: 0,
        fetchedFromApi: 0,
      },
    };
  }

  // Step 1: Check MongoDB cache for all uniqueStrings
  const cachedEntries = await Translation.find({
    sourceText: { $in: uniqueStrings },
    targetLang,
  }).lean();

  const translationMap: Record<string, string> = {};
  cachedEntries.forEach((entry) => {
    translationMap[entry.sourceText] = entry.translatedText;
  });

  // Step 2: Determine which strings are missing from cache
  const missingStrings = uniqueStrings.filter((str) => !translationMap[str]);

  let fetchedFromApiCount = 0;

  // Step 3: Call Google Translate API ONLY for missing strings
  if (missingStrings.length > 0) {
    const translatedFromGoogle = await callGoogleTranslateApi(
      missingStrings,
      targetLang,
      sourceLang
    );

    fetchedFromApiCount = missingStrings.length;

    const newDocsToInsert: Array<{
      updateOne: {
        filter: { sourceText: string; targetLang: string };
        update: {
          $setOnInsert: {
            sourceText: string;
            sourceLang: string;
            targetLang: string;
            translatedText: string;
            screen: string;
          };
        };
        upsert: boolean;
      };
    }> = [];

    missingStrings.forEach((originalText, index) => {
      const translatedText = translatedFromGoogle[index] || originalText;
      translationMap[originalText] = translatedText;

      newDocsToInsert.push({
        updateOne: {
          filter: { sourceText: originalText, targetLang },
          update: {
            $setOnInsert: {
              sourceText: originalText,
              sourceLang,
              targetLang,
              translatedText,
              screen,
            },
          },
          upsert: true,
        },
      });
    });

    // Save to MongoDB in bulk to avoid duplicates or race conditions
    if (newDocsToInsert.length > 0) {
      await Translation.bulkWrite(newDocsToInsert, { ordered: false }).catch(() => {
        // Silently handle any edge duplicate key collisions
      });
    }
  }

  // Step 4: If key-value 'content' was provided, map translated values back to their original keys
  const finalTranslations: Record<string, string> = {};

  if (Object.keys(content).length > 0) {
    Object.entries(content).forEach(([key, val]) => {
      const trimmed = typeof val === 'string' ? val.trim() : '';
      finalTranslations[key] = translationMap[trimmed] || val;
    });
  } else {
    // Return original string -> translated string dictionary
    uniqueStrings.forEach((str) => {
      finalTranslations[str] = translationMap[str] || str;
    });
  }

  return {
    translations: finalTranslations,
    screen,
    targetLang,
    stats: {
      totalRequested: uniqueStrings.length,
      servedFromCache: uniqueStrings.length - fetchedFromApiCount,
      fetchedFromApi: fetchedFromApiCount,
    },
  };
};

const getScreenTranslationsFromDB = async (query: {
  screen?: string;
  targetLang?: string;
}) => {
  const filter: Record<string, unknown> = {};
  if (query.screen) filter.screen = query.screen;
  if (query.targetLang) filter.targetLang = query.targetLang;

  const result = await Translation.find(filter).select('-__v').sort({ createdAt: -1 });
  return result;
};

export const TranslationServices = {
  translateScreenTexts,
  getScreenTranslationsFromDB,
};
