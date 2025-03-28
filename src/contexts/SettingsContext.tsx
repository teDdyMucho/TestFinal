import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the settings interface
export interface ThemeSettings {
  theme: 'light' | 'dark';
  background: string;
  fontFamily: string;
  fontSize: string;
  fontColor: string;
}

// Define the context interface
interface SettingsContextType {
  settings: ThemeSettings;
  updateSettings: (newSettings: Partial<ThemeSettings>) => void;
  resetSettings: () => void;
}

// Default settings
const defaultSettings: ThemeSettings = {
  theme: 'dark',
  background: 'gradient-1',
  fontFamily: 'Inter, sans-serif',
  fontSize: 'medium',
  fontColor: 'default'
};

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from localStorage or default
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const savedSettings = localStorage.getItem('themeSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  // Update settings
  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('themeSettings', JSON.stringify(updated));
      return updated;
    });
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('themeSettings', JSON.stringify(defaultSettings));
  };

  // Apply theme when settings change
  useEffect(() => {
    // Apply theme class
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(settings.theme);

    // Apply font family
    document.documentElement.style.setProperty('--font-family', settings.fontFamily);

    // Apply font size
    const fontSizeMap = {
      small: '0.875rem',
      medium: '1rem',
      large: '1.125rem',
      'x-large': '1.25rem'
    };
    document.documentElement.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize as keyof typeof fontSizeMap] || '1rem');

    // Apply custom background if not using default themes
    if (settings.background !== 'gradient-1') {
      if (settings.background.startsWith('gradient-')) {
        // Apply one of the predefined gradients
        const gradientMap = {
          'gradient-1': 'linear-gradient(to right bottom, #1a1a2e, #16213e, #0f3460)',
          'gradient-2': 'linear-gradient(to right bottom, #0f2027, #203a43, #2c5364)',
          'gradient-3': 'linear-gradient(to right bottom, #3a1c71, #d76d77, #ffaf7b)',
          'gradient-4': 'linear-gradient(to right bottom, #8e2de2, #4a00e0)',
          'gradient-5': 'linear-gradient(to right bottom, #000428, #004e92)',
        };
        document.body.style.background = gradientMap[settings.background as keyof typeof gradientMap] || gradientMap['gradient-1'];
      } else {
        // Apply solid color
        document.body.style.background = settings.background;
      }
    } else {
      // Reset to theme default
      document.body.style.background = '';
    }

    // Apply custom font color
    if (settings.fontColor !== 'default') {
      document.documentElement.style.setProperty('--custom-text-color', settings.fontColor);
      document.documentElement.classList.add('custom-text-color');
    } else {
      document.documentElement.classList.remove('custom-text-color');
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook for using the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
