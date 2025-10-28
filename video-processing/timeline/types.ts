import type { MatchEvent } from '../../packages/sdk/google-sheets';

export type HighlightLabel = 'GOAL' | 'CHANCE' | 'SKILL';

export type Clip = {
  id: string;
  label: HighlightLabel;
  startS: number;
  endS: number;
  meta?: {
    scorer?: string;
    assister?: string;
    score?: string;
    minute?: number;
    notes?: string;
  };
  sourceEvent?: MatchEvent;
};

export interface BuildClipOptions {
  minLenS?: number;
  padBeforeS?: number;
  padAfterS?: number;
  videoDurationS?: number;
}

export type SceneBoundary = {
  start: number;
  end: number;
};

export type SceneDetectOptions = {
  enabled?: boolean;
  threshold?: number;
  minSceneLen?: number;
  pythonExecutable?: string;
  workingDirectory?: string;
};

export type ClipWithScenes = Clip & { originalStartS: number; originalEndS: number };

export type ClipTemplateContext = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
};

export type ClipTitleFactory = (clip: Clip, context: ClipTemplateContext) => string;
