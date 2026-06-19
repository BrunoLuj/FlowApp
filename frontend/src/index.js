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
  let translations = {};

  try {
    translations = await fetchTranslations(language);
  } catch (error) {
    console.warn(
      `Prijevodi za jezik "${language}" nisu dostupni. Aplikacija se pokreće bez udaljenih prijevoda.`,
      error
    );
  }

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

initI18n().finally(() => {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("PWA service worker nije moguće registrirati.", error);
    });
  });
}
