/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' liga o Emulator Suite; 'false' exige VITE_FIREBASE_* completos */
  readonly VITE_USE_EMULATOR?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  /** Host do Emulator (default 'localhost'; preview força '127.0.0.1') */
  readonly VITE_EMULATOR_HOST?: string;
  /** Portas alt do Emulator para o preview local (default 8080/9099/5001) */
  readonly VITE_EMULATOR_FIRESTORE_PORT?: string;
  readonly VITE_EMULATOR_AUTH_PORT?: string;
  readonly VITE_EMULATOR_FUNCTIONS_PORT?: string;
  /** 'true' liga o auto-login do preview (dev+emulator apenas) */
  readonly VITE_PREVIEW_AUTOLOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
