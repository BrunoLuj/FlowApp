import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { fetchTranslations } from './services/translationServices.js';

const initI18n = async () => {
  const language = localStorage.getItem('language') || 'en';

  const translations = await fetchTranslations(language);

  // Inicijalizacija i18next
  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        [language]: { translation: translations },
      },
      lng: language, // Postavi zadani jezik
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
};

const root = ReactDOM.createRoot(document.getElementById('root'));

initI18n().then(() => {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});
