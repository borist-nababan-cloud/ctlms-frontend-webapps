import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { id } from './locales/id';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            id
        },
        lng: 'id',
        fallbackLng: 'id',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
