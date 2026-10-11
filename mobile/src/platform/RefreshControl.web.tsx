/**
 * Pull down to refresh for the web app. react-native-web's own
 * RefreshControl renders nothing and never calls onRefresh, so every
 * screen's pull-to-refresh did nothing in the browser and the installed web
 * app. metro.config.js swaps this in for react-native-web's on web only; the
 * phone build keeps the native one.
 *
 * react-native-web's ScrollView clones its `refreshControl` around itself
 * (children = the scroll view, style = the scroll view's style), so this
 * wraps the list, watches touches and, when the list is already at the top
 * and is pulled down far enough, calls onRefresh.
 *
 * Imports come straight from react-native-web's files: importing
 * 'react-native' here would loop back to this file.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { StyleProp, View as ViewType, ViewStyle } from 'react-native';
import View from 'react-native-web/dist/exports/View';
import ActivityIndicator from 'react-native-web/dist/exports/ActivityIndicator';
import { pullDistance, PULL_TRIGGER, scrolledAwayFromTop, type ScrollerLike } from './pullToRefresh';

interface Props {
  refreshing?: boolean;
  onRefresh?: () => void;
  enabled?: boolean;
  tintColor?: string;
  colors?: string[];
  progressBackgroundColor?: string;
  progressViewOffset?: number;
  size?: unknown;
  title?: string;
  titleColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  [key: string]: unknown;
}

const SPINNER = 40;
/** Where the spinner rests while refreshing (px from the top) */
const REST = 14;

export default function RefreshControl(props: Props) {
  const {
    refreshing = false, onRefresh, enabled = true, tintColor, colors, progressBackgroundColor,
    progressViewOffset, size, title, titleColor, style, children, ...rest
  } = props;
  const wrap = useRef<ViewType>(null);
  const [pull, setPull] = useState(0);
  const latest = useRef({ onRefresh, refreshing, enabled });
  latest.current = { onRefresh, refreshing, enabled };

  useEffect(() => {
    // On web a View's ref is its DOM element
    const node = wrap.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return undefined;
    const drag = { startY: 0, active: false, pull: 0 };

    const scrollersFrom = (target: EventTarget | null): ScrollerLike[] => {
      const list: ScrollerLike[] = [];
      for (let el = target as HTMLElement | null; el && el !== node.parentElement; el = el.parentElement) {
        const overflow = window.getComputedStyle(el).overflowY;
        if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) list.push(el);
      }
      return list;
    };

    const reset = () => { drag.active = false; drag.pull = 0; setPull(0); };

    const onStart = (e: TouchEvent) => {
      const { onRefresh: refresh, refreshing: busy, enabled: on } = latest.current;
      if (!refresh || busy || !on || e.touches.length !== 1) return;
      if (scrolledAwayFromTop(scrollersFrom(e.target))) return;
      drag.startY = e.touches[0].clientY;
      drag.active = true;
      drag.pull = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!drag.active) return;
      const dy = e.touches[0].clientY - drag.startY;
      if (dy < -8) { reset(); return; } // scrolling up the list, not pulling
      drag.pull = pullDistance(dy);
      setPull(drag.pull);
      // Hold the page still while pulling (no bounce, no browser reload)
      if (drag.pull > 4 && e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      if (!drag.active) return;
      const pulledFar = drag.pull >= PULL_TRIGGER;
      reset();
      if (pulledFar) latest.current.onRefresh?.();
    };

    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', reset);
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', reset);
    };
  }, []);

  const color = tintColor || colors?.[0] || '#19E3FF';
  const showing = refreshing || pull > 0;
  const top = refreshing ? REST + (progressViewOffset ?? 0) : pull - SPINNER;
  const ready = pull >= PULL_TRIGGER;

  return (
    <View ref={wrap} style={style} {...rest}>
      {children}
      {showing ? (
        <View
          pointerEvents="none"
          accessibilityRole="progressbar"
          accessibilityLabel={refreshing ? 'Refreshing' : ready ? 'Let go to refresh' : 'Pull down to refresh'}
          style={{
            position: 'absolute', top, left: 0, right: 0, alignItems: 'center',
            opacity: refreshing ? 1 : Math.min(1, pull / PULL_TRIGGER),
          }}
        >
          <View
            style={{
              width: SPINNER, height: SPINNER, borderRadius: SPINNER / 2, alignItems: 'center', justifyContent: 'center',
              backgroundColor: progressBackgroundColor || 'rgba(16, 20, 26, 0.94)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)',
              transform: [{ rotate: `${Math.round(pull * 3)}deg` }],
            }}
          >
            <ActivityIndicator size="small" color={color} animating={refreshing || ready} hidesWhenStopped={false} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
