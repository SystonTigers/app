'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface TourStep {
    target: string;
    title: string;
    content: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingContextType {
    isActive: boolean;
    currentStep: number;
    startTour: () => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const TOUR_STEPS: TourStep[] = [
    {
        target: '[data-tour="home"]',
        title: 'Welcome to Your Team Hub! 🏟️',
        content: 'This is your team\'s home base. Get match updates, news, and quick stats all in one place.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="fixtures"]',
        title: 'Upcoming Fixtures 📅',
        content: 'Never miss a match! View upcoming fixtures with countdown timers and weather forecasts.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="squad"]',
        title: 'Meet the Squad 👥',
        content: 'Explore player profiles, compare stats, and track performance throughout the season.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="training"]',
        title: 'Training Centre ⚽',
        content: 'Access training sessions, drills, tactics setup, and AI-powered coaching tools.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="search"]',
        title: 'Quick Search ⌘K',
        content: 'Press ⌘K (or Ctrl+K) anytime to quickly navigate anywhere in the app!',
        placement: 'bottom',
    },
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasSeenTour, setHasSeenTour] = useState(true);

    useEffect(() => {
        const seen = localStorage.getItem('onboarding_completed');
        if (!seen) {
            setHasSeenTour(false);
            // Auto-start tour after a delay for new users
            setTimeout(() => setIsActive(true), 1500);
        }
    }, []);

    const startTour = () => {
        setCurrentStep(0);
        setIsActive(true);
    };

    const endTour = () => {
        setIsActive(false);
        setCurrentStep(0);
        localStorage.setItem('onboarding_completed', 'true');
        setHasSeenTour(true);
    };

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <OnboardingContext.Provider value={{ isActive, currentStep, startTour, endTour, nextStep, prevStep }}>
            {children}
            {isActive && <TourOverlay step={TOUR_STEPS[currentStep]} stepNumber={currentStep} totalSteps={TOUR_STEPS.length} />}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        return {
            isActive: false,
            currentStep: 0,
            startTour: () => { },
            endTour: () => { },
            nextStep: () => { },
            prevStep: () => { },
        };
    }
    return context;
}

function TourOverlay({ step, stepNumber, totalSteps }: { step: TourStep; stepNumber: number; totalSteps: number }) {
    const { nextStep, prevStep, endTour } = useOnboarding();
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const target = document.querySelector(step.target);
        if (target) {
            const rect = target.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 16,
                left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
            });
            // Highlight effect
            target.classList.add('ring-4', 'ring-brand', 'ring-offset-2', 'rounded-xl', 'z-[60]', 'relative');
            return () => {
                target.classList.remove('ring-4', 'ring-brand', 'ring-offset-2', 'rounded-xl', 'z-[60]', 'relative');
            };
        }
    }, [step]);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50" onClick={endTour} />

            {/* Tooltip */}
            <div
                className="fixed z-[70] w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in"
                style={{ top: position.top, left: position.left }}
            >
                {/* Progress bar */}
                <div className="h-1 bg-gray-200 dark:bg-gray-700">
                    <div
                        className="h-full bg-brand transition-all duration-300"
                        style={{ width: `${((stepNumber + 1) / totalSteps) * 100}%` }}
                    />
                </div>

                <div className="p-5">
                    <h3 className="text-lg font-black mb-2">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{step.content}</p>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                            {stepNumber + 1} of {totalSteps}
                        </span>
                        <div className="flex gap-2">
                            {stepNumber > 0 && (
                                <button
                                    onClick={prevStep}
                                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={nextStep}
                                className="px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand/90 transition-colors"
                            >
                                {stepNumber === totalSteps - 1 ? 'Done!' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// Button to restart tour
export function RestartTourButton() {
    const { startTour } = useOnboarding();

    return (
        <button
            onClick={startTour}
            className="flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand font-bold rounded-xl hover:bg-brand/20 transition-colors"
        >
            <span>🎓</span>
            Take a Tour
        </button>
    );
}
