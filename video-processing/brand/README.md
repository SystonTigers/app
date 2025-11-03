# Brand Assets for Broadcast Overlays

This directory contains all brand assets used for creating professional broadcast overlays.

## Directory Structure

```
brand/
├── badges/
│   ├── home_team.png       # Home team badge/logo
│   └── away_team.png       # Away team badge/logo
├── fonts/
│   ├── Inter-Bold.ttf      # Bold font for titles
│   └── Inter-Regular.ttf   # Regular font for subtitles
├── templates/
│   ├── scorebug_template.png      # 400x100, transparent background
│   ├── lower_third_template.png   # 1920x200, semi-transparent
│   ├── opening_slate_bg.png       # 1920x1080
│   └── closing_slate_bg.png       # 1920x1080
├── stinger.mov                    # 0.5s transition with alpha channel
└── luts/
    └── club_lut.cube              # Optional color grading LUT
```

## Asset Requirements

### Images (PNG)
- **All PNGs must have transparency (alpha channel)**
- Team badges: Recommended size 200x200px
- Scorebug template: 400x100px with transparent background
- Lower-third template: 1920x200px with semi-transparent background
- Slate backgrounds: 1920x1080px

### Fonts
- Must be TrueType (.ttf) or OpenType (.otf) format
- Recommended: Inter, Roboto, or any clean sans-serif font
- Need both Bold and Regular weights

### Stinger Transition
- Duration: 0.25-0.5 seconds
- Format: ProRes 4444 or H.264 with alpha channel
- Must have transparency for overlay effect

### LUT (Optional)
- Format: .cube format only
- Used for color grading to match club brand colors

## Fallback Behavior

If assets are not provided, the system will:
- Use default fonts (system fonts)
- Generate templates from scratch with semi-transparent backgrounds
- Skip stinger transitions
- Use default colors and layouts

## Usage

Place your assets in the appropriate directories and update your configuration file to reference them:

```json
{
  "brand_assets": {
    "home_badge": "brand/badges/home_team.png",
    "away_badge": "brand/badges/away_team.png",
    "club_badge": "brand/badges/club.png",
    "font_bold": "brand/fonts/Inter-Bold.ttf",
    "font_regular": "brand/fonts/Inter-Regular.ttf",
    "scorebug_template": "brand/templates/scorebug_template.png",
    "lower_third_template": "brand/templates/lower_third_template.png",
    "stinger_path": "brand/stinger.mov",
    "club_lut": "brand/luts/club_lut.cube"
  }
}
```
