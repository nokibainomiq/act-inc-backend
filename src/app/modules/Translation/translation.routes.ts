import { Router } from 'express';
import validateRequest from '../../middleware/validateRequest';
import { TranslationControllers } from './translation.controller';
import { TranslationValidations } from './translation.validation';

const router = Router();

// Translate screen texts (MongoDB Cache first -> Google Translate API fallback)
router.post(
  '/screen',
  validateRequest(TranslationValidations.translateScreenValidationSchema),
  TranslationControllers.translateScreen
);

// General translate endpoint (aliases to the same screen-optimized caching logic)
router.post(
  '/',
  validateRequest(TranslationValidations.translateScreenValidationSchema),
  TranslationControllers.translateScreen
);

// View cached translations (Optional query: ?screen=dashboard&targetLang=bn)
router.get('/cache', TranslationControllers.getScreenTranslations);

export const TranslationRoutes = router;
