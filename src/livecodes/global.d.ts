import type { showMode } from './core';

// eslint-disable-next-line import/no-internal-modules
import type { I18nKeyType, I18nValueType, I18nInterpolationType } from './i18n/utils';

// declare global dependencies
declare global {
  interface Window {
    deps: {
      showMode: typeof showMode;
      /**
       * String-level i18n helper function.
       * @param key The key of the translation.
       * @param value The default value to translate.
       * @param args The interpolation object.
       * @returns The translated string.
       */
      translateString: <Key extends I18nKeyType, Value extends string>(
        key: Key,
        value: I18nValueType<Key, Value>,
        ...args: I18nInterpolationType<I18nValueType<Key, Value>>
      ) => string;
    };
  }
}
