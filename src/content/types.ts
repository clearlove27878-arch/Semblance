export type ContentType =
  | 'prologue'
  | 'case_clue'
  | 'police_clue'
  | 'visual_clue'
  | 'recording'
  | 'fictional_deduction'
  | 'terminal_chapter';

export type GateSchema = 'text_answer' | 'relation' | 'final';

export type ReasoningObjectKind = 'person' | 'clue' | 'fact';

export type ContentImageKind = 'portrait' | 'evidence' | 'scene';

export interface ContentImage {
  src: string;
  kind: ContentImageKind;
}

export type BodyBlock =
  | { kind: 'paragraph' | 'highlight'; text: string }
  | { kind: 'divider' }
  | { kind: 'pageBreak'; label?: string };

export type ContentTextBlock = Extract<BodyBlock, { kind: 'paragraph' | 'highlight' }>;

export interface GateTextFeedbackBlocks {
  partial: ContentTextBlock[];
  incorrect: ContentTextBlock[];
  success: ContentTextBlock[];
  reveal: ContentTextBlock[];
}

export interface PlayerContentRecord {
  id: string;
  type: ContentType;
  category: string;
  title: string;
  displayTitle: string;
  standardName: string | null;
  aliases: string[];
  searchAliases: string[];
  body: string[];
  bodyBlocks: BodyBlock[];
  pages: BodyBlock[][];
  pageLabels: string[];
  highlights: string[];
  visibleHighlights: string[];
  imageRef: string | null;
  image: string | null;
  images: ContentImage[];
  openingImage: ContentImage | null;
  endingImage: ContentImage | null;
  relationObjectId: string | null;
}

export interface GateFeedbackBlocks {
  partial: string[];
  incorrect: string[];
  success: string[];
  reveal: string[];
}

export interface GatePlayerContent {
  id: string;
  type: GateSchema;
  title: string;
  displayTitle: string;
  prompt: string;
  promptBlocks: string[];
  promptTextBlocks: ContentTextBlock[];
  player: {
    instructionsBlocks: string[];
    feedback: GateFeedbackBlocks;
    textBlocks: {
      instructions: ContentTextBlock[];
      feedback: GateTextFeedbackBlocks;
      forceFeedback?: Array<{
        success: ContentTextBlock[];
        partial: ContentTextBlock[];
        incorrect: ContentTextBlock[];
      }>;
    };
    forceFeedback?: Array<{
      label: string;
      success: string[];
      partial: string[];
      incorrect: string[];
    }>;
    feedbackSections?: Array<{ key: string; blocks: string[]; textBlocks?: ContentTextBlock[] }>;
  };
}

export interface TextGateRuntime {
  normalization: string;
  acceptedAnswers: string[];
  partialAliases: string[];
}

export interface RelationGateRuntime {
  matching: 'unordered_set';
  requiredCount: number;
  standardSets: Array<{ forceId: string; objectIds: string[] }>;
}

export interface FinalGateRuntime {
  matching: 'semantic_slots';
  slots: Array<{ objectId: string; slotId: 'killer_slot' | 'medium_slot' | 'action_slot' | 'wound_slot' | 'disposal_slot' }>;
}

export type GateRuntimeSpec = TextGateRuntime | RelationGateRuntime | FinalGateRuntime;

export interface GateObjectMapping {
  label: string;
  contentId: string;
  kind: ReasoningObjectKind;
  canonicalId?: string;
}

export interface RegistryGate extends GatePlayerContent {
  runtime: GateRuntimeSpec;
}

export interface GeneratedPlayerData {
  version: number;
  contents: PlayerContentRecord[];
  gates: GatePlayerContent[];
}

export interface GeneratedRuntimeData {
  version: number;
  gates: Array<{ id: string; type: GateSchema; runtime: GateRuntimeSpec }>;
  objectMap: Record<string, GateObjectMapping>;
}
