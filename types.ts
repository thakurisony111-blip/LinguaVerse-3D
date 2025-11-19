export enum Language {
  FRENCH = 'French',
  SPANISH = 'Spanish',
  JAPANESE = 'Japanese',
  GERMAN = 'German'
}

export enum Scenario {
  CAFE = 'Cafe',
  TRAIN_STATION = 'Train Station',
  MARKET = 'Market'
}

export enum InputMode {
  VOICE = 'voice',
  TEXT = 'text'
}

export enum MicState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking'
}

export interface GameState {
  isInGame: boolean;
  language: Language;
  scenario: Scenario;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  isFinal?: boolean; // To track if the sentence is complete
}