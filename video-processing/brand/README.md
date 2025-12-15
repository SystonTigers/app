# Brand Assets Setup Guide

## Quick Start

This directory contains brand assets for professional broadcast-quality overlays.

## Required Assets

### 1. Badges (`badges/`)
Place your team badges here:
- `club_badge.png` - Your main club badge (recommended: 256x256px, transparent PNG)
- `home_team.png` - Home team badge (used in scorebugs)
- `away_team.png` - Away team badge (used in scorebugs)

### 2. Fonts (`fonts/`)
Custom fonts for overlays:
- `Inter-Bold.ttf` - Bold font for titles, scores
- `Inter-Regular.ttf` - Regular font for descriptions

**Free fonts:** Download Inter from https://fonts.google.com/specimen/Inter

### 3. Templates (`templates/`)
Overlay background templates:
- `scorebug_template.png` - Scorebug background (420x60px recommended)
- `lower_third_template.png` - Lower-third background (1920x200px)
- `opening_slate_bg.png` - Opening slate (1920x1080px)
- `closing_slate_bg.png` - Closing slate (1920x1080px)

### 4. LUTs (`luts/`)
Color grading LUTs:
- `club_lut.cube` - Optional custom color grading

### 5. Transitions
- `stinger.mov` - Animated transition (optional, 1-2 seconds)

## Fallback Behavior

If any asset is missing, the system will:
1. Use solid color backgrounds instead
2. Use system fonts (may look less professional)
3. Skip overlays that require missing assets

## How to Get Started

1. Export your club badge as a transparent PNG
2. Download Inter fonts from Google Fonts
3. Create simple templates in Canva/Photoshop
4. Place files in appropriate directories
5. Update `config.yaml` if using custom filenames
