export enum AppState {
  UPLOAD = 'UPLOAD',
  CONFIG = 'CONFIG',
  GENERATING = 'GENERATING',
  VIEWING = 'VIEWING',
}

export interface ComicPage {
  pageNumber: number;
  panelDescription: string;
  dialogue: string;
  imageUrl?: string;
  isLoading: boolean;
}

export interface ComicStory {
  title: string;
  heroName: string;
  pages: ComicPage[];
}

export interface UserSettings {
  heroName: string;
  superpower: string;
  villain: string;
  setting: string;
  artStyle: string;
}

export enum AudioStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}
