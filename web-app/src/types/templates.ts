
export interface TemplateElement {
    type: 'text' | 'image' | 'list';
    id: string;
    label: string;
    default?: string | string[];
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    font?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    lineHeight?: number;
}

export interface TemplateConfig {
    id: string;
    name: string;
    category: 'pre-match' | 'live' | 'post-match' | 'news';
    format: 'square' | 'story';
    width: number;
    height: number;
    backgroundUrl: string; // Path relative to public folder
    overlayElements: TemplateElement[];
}
