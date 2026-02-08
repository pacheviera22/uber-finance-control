import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { FinanceProvider } from '../context/FinanceContext';

// Improved Supabase Mock with Thenable Builder
vi.mock('../supabaseClient', () => {
    const createBuilder = (table) => {
        // Base response data based on table
        let data = [];
        if (table === 'sessions') data = { status: 'idle', meta: 250 };
        else if (table === 'trips') data = [];
        else if (table === 'daily_records') data = [];

        // The builder must be a Promise (thenable) AND have methods
        const builder = {
            select: () => builder,
            eq: () => builder,
            order: () => builder,
            single: () => {
                // single() usually expects an object (not array) if data is array
                // For 'sessions' we already set object, but let's be safe
                return builder;
            },
            insert: () => Promise.resolve({ error: null }),
            update: () => builder,
            upsert: () => Promise.resolve({ error: null }),
            delete: () => builder,
            then: (resolve) => resolve({ data, error: null })
        };
        return builder;
    };

    return {
        supabase: {
            from: (table) => createBuilder(table),
            channel: () => {
                const chan = {
                    on: () => chan,
                    subscribe: () => ({})
                };
                return chan;
            },
            removeChannel: () => ({}),
        },
    };
});

// Mock Translations
vi.mock('../utils/translations', () => ({
    translations: {
        es: { appName: 'Seguimiento Uber', startShift: 'Iniciar Turno' },
        en: { appName: 'Uber Tracker', startShift: 'Start Shift' }
    }
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        clear: vi.fn(),
        removeItem: vi.fn()
    },
    writable: true
});

describe('System Integrity Smoke Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the main application without crashing', async () => {
        render(<App />);

        // Check for basic UI elements that indicate successful load
        // We look for 'Bienvenido' which is the main H1 in HomeMenu
        await waitFor(() => {
            // screen.debug(); // Uncomment to see DOM in console if this fails again
            const appElement = screen.getByText(/Bienvenido/i);
            expect(appElement).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
