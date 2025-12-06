'use client';

import { useEffect, useRef, useState } from 'react';

interface ConfettiPiece {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    size: number;
}

interface ConfettiProps {
    isActive: boolean;
    duration?: number;
    particleCount?: number;
}

const COLORS = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8000', '#8000ff', '#00ff80', '#ff0080', '#80ff00', '#0080ff',
];

export function Confetti({ isActive, duration = 3000, particleCount = 150 }: ConfettiProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const particlesRef = useRef<ConfettiPiece[]>([]);

    useEffect(() => {
        if (!isActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Create particles
        particlesRef.current = Array.from({ length: particleCount }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 100,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 3 + 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: Math.random() * 10 + 5,
        }));

        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particlesRef.current.forEach((particle) => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // gravity
                particle.rotation += particle.rotationSpeed;

                // Air resistance
                particle.vx *= 0.99;

                // Draw
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate((particle.rotation * Math.PI) / 180);
                ctx.fillStyle = particle.color;
                ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
                ctx.restore();
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Play celebration sound
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Audio not supported
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive, duration, particleCount]);

    if (!isActive) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
}

// Hook for easy confetti triggering
export function useConfetti() {
    const [isActive, setIsActive] = useState(false);

    const trigger = () => {
        setIsActive(true);
        setTimeout(() => setIsActive(false), 3500);
    };

    return { isActive, trigger };
}
