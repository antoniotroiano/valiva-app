import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { migrateStoragePrefix } from './storagePrefixMigration';

// Must run before anything reads the storage (rename to Valiva, 2026-11-22).
try {
  migrateStoragePrefix(localStorage);
} catch {
  /* storage unavailable: the app reports it itself */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
