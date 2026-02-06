import { useState, useEffect, useRef } from 'react';

export const useVoiceScanner = (language = 'es-ES') => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [lastCommand, setLastCommand] = useState(null);

    const recognitionRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false; // Stop after one sentence
            recognitionRef.current.interimResults = true; // Show text while speaking
            recognitionRef.current.lang = language;
        } else {
            setError('Speech Recognition not supported in this browser.');
        }
    }, [language]);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setTranscript('');
                setError(null);
                setLastCommand(null);
            } catch (e) {
                console.error("Mic Error:", e);
                setError("Mic busy or denied.");
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Command Parsing Logic
    const processCommand = (text) => {
        setProcessing(true);
        const lower = text.toLowerCase();

        // 1. Detect "Add Trip" pattern: "Uber [number]", "Trip [number]"
        // Regex for numbers: 15.50, 15,50, 15
        const numberPattern = /(\d+[.,]?\d*)/;
        const match = lower.match(numberPattern);

        let action = null;

        if (match) {
            // Normalize number (replace , with .)
            const amount = parseFloat(match[0].replace(',', '.'));

            if (!isNaN(amount)) {
                // Determine platform
                let platform = 'uber'; // default
                if (lower.includes('lyft') || lower.includes('lift')) platform = 'lyft';
                if (lower.includes('cash') || lower.includes('efectivo')) platform = 'cash';

                action = {
                    type: 'ADD_TRIP',
                    payload: { amount, platform }
                };
            }
        } else if (lower.includes('pausa') || lower.includes('pause') || lower.includes('stop')) {
            action = { type: 'PAUSE_SHIFT' };
        } else if (lower.includes('resume') || lower.includes('continuar')) {
            action = { type: 'RESUME_SHIFT' };
        }

        setLastCommand(action);
        setProcessing(false);
        return action;
    };

    // Event Handlers
    useEffect(() => {
        if (!recognitionRef.current) return;

        recognitionRef.current.onresult = (event) => {
            const current = event.resultIndex;
            const text = event.results[current][0].transcript;
            setTranscript(text);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
            // Process the final transcript
            if (transcript) {
                processCommand(transcript);
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error("Speech Error:", event.error);
            setError(event.error);
            setIsListening(false);
        };

    }, [transcript]);

    return {
        isListening,
        startListening,
        stopListening,
        transcript,
        lastCommand,
        error,
        supported: !!recognitionRef.current
    };
};
