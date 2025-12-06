'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Sound library using Web Audio API
class SoundManager {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    // Generic beep sound
    private playTone(frequency: number, duration: number, volume: number = 0.1) {
        if (!this.enabled) return;

        try {
            const ctx = this.getContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            // Audio not supported
        }
    }

    // Notification sound - gentle chime
    playNotification() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            [880, 1109].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.05, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3 + i * 0.1);
                osc.start(now + i * 0.1);
                osc.stop(now + 0.3 + i * 0.1);
            });
        } catch (e) { }
    }

    // Success sound - ascending notes
    playSuccess() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            [523, 659, 784].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.08, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25 + i * 0.08);
                osc.start(now + i * 0.08);
                osc.stop(now + 0.25 + i * 0.08);
            });
        } catch (e) { }
    }

    // Error sound - low buzz
    playError() {
        this.playTone(200, 0.2, 0.1);
    }

    // Click sound - quick pop
    playClick() {
        this.playTone(800, 0.05, 0.03);
    }

    // Message sent sound
    playMessageSent() {
        this.playTone(600, 0.1, 0.05);
    }

    // Message received sound
    playMessageReceived() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            [440, 554].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.04, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15 + i * 0.05);
                osc.start(now + i * 0.05);
                osc.stop(now + 0.15 + i * 0.05);
            });
        } catch (e) { }
    }

    // Goal celebration!
    playGoal() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Rising arpeggio
            [262, 330, 392, 523, 659, 784].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.1, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3 + i * 0.05);
                osc.start(now + i * 0.05);
                osc.stop(now + 0.3 + i * 0.05);
            });
        } catch (e) { }
    }
}

// Create singleton
const soundManager = new SoundManager();

// Context for sound settings
interface SoundContextType {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    playNotification: () => void;
    playSuccess: () => void;
    playError: () => void;
    playClick: () => void;
    playMessageSent: () => void;
    playMessageReceived: () => void;
    playGoal: () => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
    const [enabled, setEnabledState] = useState(true);

    const setEnabled = useCallback((value: boolean) => {
        setEnabledState(value);
        soundManager.setEnabled(value);
    }, []);

    const value: SoundContextType = {
        enabled,
        setEnabled,
        playNotification: () => soundManager.playNotification(),
        playSuccess: () => soundManager.playSuccess(),
        playError: () => soundManager.playError(),
        playClick: () => soundManager.playClick(),
        playMessageSent: () => soundManager.playMessageSent(),
        playMessageReceived: () => soundManager.playMessageReceived(),
        playGoal: () => soundManager.playGoal(),
    };

    return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSounds() {
    const context = useContext(SoundContext);
    if (!context) {
        // Return dummy functions if not in provider
        return {
            enabled: false,
            setEnabled: () => { },
            playNotification: () => { },
            playSuccess: () => { },
            playError: () => { },
            playClick: () => { },
            playMessageSent: () => { },
            playMessageReceived: () => { },
            playGoal: () => { },
        };
    }
    return context;
}

// Sound toggle button component
export function SoundToggle() {
    const { enabled, setEnabled } = useSounds();

    return (
        <button
            onClick={() => setEnabled(!enabled)}
            className={`p-2 rounded-xl transition-colors ${enabled
                    ? 'bg-brand/10 text-brand'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}
            title={enabled ? 'Sound On' : 'Sound Off'}
        >
            {enabled ? '🔊' : '🔇'}
        </button>
    );
}
