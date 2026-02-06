import React, { useEffect } from 'react';
import { useVoiceScanner } from '../../hooks/useVoiceScanner';
import { Mic, MicOff, Check, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export default function VoiceControl() {
    const { actions, config } = useFinance(); // We need language from somewhere, currently hardcoded or passed
    // Assuming language preference is in FinanceContext, but config usually has numbers. 
    // Let's use 'es-ES' as default based on user profile, or grab from context if available.

    // Quick fix: FinanceContext doesn't expose language directly in the 'value' destructuring in my memory? 
    // Let's check FinanceContext... it does: 'language'
    const { language } = useFinance();

    const langCode = language === 'en' ? 'en-US' : 'es-ES';
    const { isListening, startListening, stopListening, transcript, lastCommand, error, supported } = useVoiceScanner(langCode);

    // Execute Command when detected
    useEffect(() => {
        if (lastCommand) {
            if (lastCommand.type === 'ADD_TRIP') {
                actions.addTrip({
                    amount: lastCommand.payload.amount,
                    platform: lastCommand.payload.platform,
                    timestamp: Date.now(),
                    odometer: 0 // Optional: fetch last odometer if needed? Logic handles it.
                });
            } else if (lastCommand.type === 'PAUSE_SHIFT') {
                actions.pauseShift();
            } else if (lastCommand.type === 'RESUME_SHIFT') {
                actions.resumeShift();
            }
            // Auto-hide transcript after 3s could be handled by local state if needed
        }
    }, [lastCommand]);

    if (!supported) return null;

    return (
        <>
            {/* Floating Mic Button */}
            <button
                onClick={isListening ? stopListening : startListening}
                style={{
                    position: 'fixed',
                    bottom: '100px', // Above the Add Trip FAB
                    right: '24px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: isListening ? '#ff4d4d' : 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                }}
            >
                {isListening ? (
                    <MicOff size={24} color="white" className="pulse-animation" />
                ) : (
                    <Mic size={24} color="var(--accent-color)" />
                )}
            </button>

            {/* Transcript/Feedback Overlay */}
            {(isListening || transcript || lastCommand) && (
                <div style={{
                    position: 'fixed',
                    bottom: '170px',
                    right: '24px',
                    maxWidth: '250px',
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    zIndex: 99,
                    fontSize: '14px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {isListening && !transcript && <span style={{ fontStyle: 'italic', color: '#aaa' }}>Escuchando...</span>}
                    {transcript && <div style={{ marginBottom: '8px' }}>"{transcript}"</div>}

                    {error && <div style={{ color: '#ff4d4d', fontSize: '12px' }}>{error}</div>}

                    {lastCommand && (
                        <div style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#00D775'
                        }}>
                            <Check size={16} />
                            <span>
                                {lastCommand.type === 'ADD_TRIP' && `Agregado $${lastCommand.payload.amount}`}
                                {lastCommand.type === 'PAUSE_SHIFT' && 'Pausado'}
                                {lastCommand.type === 'RESUME_SHIFT' && 'Reanudado'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .pulse-animation {
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </>
    );
}
