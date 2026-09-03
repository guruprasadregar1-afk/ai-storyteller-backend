import { TranslationResult } from '../../types';

export interface ITranslationProvider {
  name: string;
  translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult>;
}
