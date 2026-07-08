import useStore from '../../store/store';
import { DEFAULT_LANGUAGE, translate } from './translations';

export { DEFAULT_LANGUAGE, LANGUAGES, translations, translate } from './translations';

export const SORT_OPTION_KEYS = ['id', 'name', 'price', 'date'];
export const DATE_PRESET_IDS = ['today', 'week', 'month', 'all'];

export function useTranslation() {
  const language = useStore((s) => s.language) || DEFAULT_LANGUAGE;
  const t = (key, params) => translate(language, key, params);
  const sortOptions = SORT_OPTION_KEYS.map((key) => ({
    key,
    label: translate(language, `sort_${key}`),
  }));
  const datePresets = DATE_PRESET_IDS.map((id) => ({
    id,
    label: translate(language, `preset_${id}`),
  }));
  return { t, language, sortOptions, datePresets };
}
