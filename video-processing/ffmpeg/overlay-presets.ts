export type AspectRatio = '16:9' | '9:16';

export interface DrawTextPreset {
  x: string;
  y: string;
  fontSize: number;
  boxOpacity: number;
  boxColor: string;
  boxBorder: number;
  fontColor: string;
}

export interface OverlayPreset {
  aspect: AspectRatio;
  scorebar: {
    x: string;
    y: string;
    scale?: string;
  };
  sponsor: {
    x: string;
    y: string;
    scale?: string;
  };
  scoreline: DrawTextPreset;
  detail: DrawTextPreset;
}

export const overlayPresets: Record<AspectRatio, OverlayPreset> = {
  '16:9': {
    aspect: '16:9',
    scorebar: {
      x: '20',
      y: '20',
    },
    sponsor: {
      x: 'W-20-w',
      y: '20',
    },
    scoreline: {
      x: '40',
      y: '36',
      fontSize: 48,
      boxOpacity: 0.4,
      boxColor: 'black',
      boxBorder: 10,
      fontColor: 'white',
    },
    detail: {
      x: '40',
      y: '108',
      fontSize: 36,
      boxOpacity: 0.4,
      boxColor: 'black',
      boxBorder: 8,
      fontColor: 'white',
    },
  },
  '9:16': {
    aspect: '9:16',
    scorebar: {
      x: '20',
      y: '20',
      scale: 'iw*0.8/iw',
    },
    sponsor: {
      x: 'W-20-w',
      y: 'H-20-h',
      scale: 'iw*0.6/iw',
    },
    scoreline: {
      x: '40',
      y: '260',
      fontSize: 60,
      boxOpacity: 0.45,
      boxColor: 'black',
      boxBorder: 12,
      fontColor: 'white',
    },
    detail: {
      x: '40',
      y: '340',
      fontSize: 46,
      boxOpacity: 0.45,
      boxColor: 'black',
      boxBorder: 10,
      fontColor: 'white',
    },
  },
};

export function getOverlayPreset(aspect: AspectRatio): OverlayPreset {
  return overlayPresets[aspect] ?? overlayPresets['16:9'];
}
