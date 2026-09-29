import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/** One flat-topped hexagon outline centred at (cx, cy). */
function hexPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join('L')}Z`;
}

/**
 * The brand backdrop: a faint hex grid and circuit traces under a soft glow
 * in the club's colour. Drawn (not an image), so it's sharp on every screen.
 */
export default function Backdrop({ color, width = 420, height = 320, glowY = 0.35, intensity = 1 }: {
  color: string; width?: number; height?: number; glowY?: number; intensity?: number;
}) {
  const hexes = useMemo(() => {
    const r = 26;
    const w = Math.sqrt(3) * r;
    const out: string[] = [];
    for (let row = -1; row * r * 1.5 < height + r; row++) {
      for (let col = -1; col * w < width + w; col++) {
        const cx = col * w + (row % 2 ? w / 2 : 0);
        const cy = row * r * 1.5;
        out.push(hexPath(cx, cy, r - 1));
      }
    }
    return out.join(' ');
  }, [width, height]);

  // Circuit traces from the edges: across, a 45° step, across again, ending in a pad
  const traces = useMemo(() => {
    const t: Array<{ d: string; end: [number, number] }> = [];
    const step = 150;
    for (let i = 0, y = 42; y < height; i++, y += step) {
      const left = i % 2 === 0;
      const run1 = width * (0.14 + ((i * 37) % 10) / 100);
      const drop = 18 + ((i * 13) % 3) * 8;
      const run2 = width * 0.08;
      const x0 = left ? 0 : width;
      const dir = left ? 1 : -1;
      const x1 = x0 + dir * run1;
      const x2 = x1 + dir * drop;
      const x3 = x2 + dir * run2;
      t.push({ d: `M${x0},${y} L${x1},${y} L${x2},${y + drop} L${x3},${y + drop}`, end: [x3, y + drop] });
      // a shorter partner trace on the other side
      const y2 = y + step / 2;
      const xo = left ? width : 0;
      const xa = xo - dir * width * 0.1;
      t.push({ d: `M${xo},${y2} L${xa},${y2} L${xa - dir * 14},${y2 - 14}`, end: [xa - dir * 14, y2 - 14] });
    }
    return t;
  }, [width, height]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy={`${glowY * 100}%`} rx="65%" ry="60%">
            <Stop offset="0" stopColor={color} stopOpacity={0.32 * intensity} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.1 * intensity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="fade" cx="50%" cy={`${glowY * 100}%`} rx="75%" ry="75%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.07} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.015} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#glow)" />
        <Path d={hexes} stroke="url(#fade)" strokeWidth={1} fill="none" />
        {traces.map((t, i) => (
          <React.Fragment key={i}>
            <Path d={t.d} stroke={color} strokeOpacity={0.22 * intensity} strokeWidth={1.2} fill="none" />
            <Circle cx={t.end[0]} cy={t.end[1]} r={2.6} fill={color} fillOpacity={0.45 * intensity} />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
