/* eslint-disable import/no-named-as-default-member */
import i18n from 'i18next';
import backend from 'i18next-http-backend';

export const init = (lng: string | undefined, baseUrl: string) => {
  i18n.use(backend).init({
    lng,
    debug: true, // Remove this line in production
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: (lngs: string[], nss: string[]) => {
        const lng = lngs[0];
        const ns = nss[0];
        if (lng === 'ar' && ns === 'translation') {
          return baseUrl + '{{hash:translation-ar-translation.json}}';
        }
        if (lng === 'ar' && ns === 'language-info') {
          return baseUrl + '{{hash:translation-ar-language-info.json}}';
        }
        if (lng === 'en' && ns === 'translation') {
          return baseUrl + '{{hash:translation-en-translation.json}}';
        }
        if (lng === 'en' && ns === 'language-info') {
          return baseUrl + '{{hash:translation-en-language-info.json}}';
        }
        if (lng === 'zh-CN' && ns === 'translation') {
          return baseUrl + '{{hash:translation-zh-CN-translation.json}}';
        }
        if (lng === 'zh-CN' && ns === 'language-info') {
          return baseUrl + '{{hash:translation-zh-CN-language-info.json}}';
        }
        return false;
      },
    },
  });
};

export default i18n;
