import React from 'react';

/**
 * EmptyState Component
 * Implements the "Master 33" influence: "The Huddle is ready."
 * Usage: <EmptyState message="Awaiting the next Top Play." />
 */
interface EmptyStateProps {
    message?: string;
    icon?: React.ReactNode;
}

export function EmptyState({ message = "Awaiting the next Top Play.", icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            {/* Hexagon Outline Container */}
            <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                {/* Pulsing Cyan Hexagon */}
                <div
                    className="absolute inset-0 bg-transparent border-2 border-brand/50 shadow-glow-8"
                    style={{
                        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                        animation: 'pulse-glow 4s ease-in-out infinite'
                    }}
                />

                {/* Inner Content Icon */}
                <div className="relative z-10 text-brand text-4xl">
                    {icon || (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>
            </div>

            <h3 className="text-xl font-heading tracking-widest text-brand mb-2 uppercase">
                The Huddle is Ready
            </h3>
            <p className="text-muted-foreground font-mono">
                {message}
            </p>
        </div>
    );
}
