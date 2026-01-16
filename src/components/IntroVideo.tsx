import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { VideoOff } from 'lucide-react';

interface IntroVideoProps {
    onComplete: () => void;
}

export const IntroVideo = ({ onComplete }: IntroVideoProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Timeout to ensure we don't get stuck if video fails or is too long
        const timer = setTimeout(() => {
            onComplete();
        }, 8000); // 8 seconds max

        return () => clearTimeout(timer);
    }, [onComplete]);

    const handleVideoError = () => {
        console.error("Intro video failed to load or play.");
        setHasError(true);
        // If video fails, wait a short moment or skip immediately. 
        // Let's skip immediately to avoid black screen.
        onComplete();
    };

    if (hasError) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
                onEnded={onComplete}
                onError={handleVideoError}
                src="/intro.mp4"
            >
                <source src="/intro.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            <div className="absolute bottom-8 right-4">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onComplete}
                    className="bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm border-none"
                >
                    Skip
                </Button>
            </div>
        </div>
    );
};
