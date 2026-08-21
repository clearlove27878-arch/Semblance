import type { MaterialCategory } from '../types';
import type { BodyBlock, ContentImage, ContentType } from '../../content/types';

export type { BodyBlock, ContentType } from '../../content/types';

export interface Material {
  id: string;
  type?: ContentType;
  category: MaterialCategory | string;
  title: string;
  displayTitle?: string;
  summary?: string;
  body: string[];
  standardName?: string;
  aliases?: string[];
  searchAliases?: string[];
  thumbnail?: string;
  image?: string | null;
  imageRef?: string | null;
  images?: ContentImage[];
  highlights?: string[];
  visibleHighlights?: string[];
  bodyBlocks?: BodyBlock[];
  pages?: BodyBlock[][];
  pageLabels?: string[];
  relationObjectId?: string | null;
}

export interface Question {
  id: string;
  text: string;
  label?: string;
}

export interface SpecialReading {
  id: string;
  title: string;
  summary?: string;
  body: string[];
  kind?: 'dialogue' | 'poem';
  bodyBlocks?: BodyBlock[];
}

export interface StorySummary {
  id: string;
  title: string;
}

export interface StoryContent extends StorySummary {
  subtitle?: string;
  paragraphs: string[];
  bodyBlocks?: BodyBlock[];
  pages?: BodyBlock[][];
  pageLabels?: string[];
  openingImage?: ContentImage | null;
  endingImage?: ContentImage | null;
}

export interface FinalStorySection {
  heading: string;
  paragraphs: string[];
}

export interface FinalStory {
  title: string;
  subtitle: string;
  sections: FinalStorySection[];
}

export interface PhaseModule {
  materials?: Material[];
  questions?: Question[];
  specialReadings?: SpecialReading[];
  stories?: StorySummary[];
}

export interface DeskContent {
  materials: Material[];
  questions: Question[];
  specialReadings: SpecialReading[];
  stories: StorySummary[];
}
