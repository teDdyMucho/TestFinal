import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Palette, Type, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSettings } from '@/contexts/SettingsContext';

const Settings = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if the screen is mobile size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Predefined background options
  const backgroundOptions = [
    { value: 'gradient-1', label: 'Default Gradient' },
    { value: 'gradient-2', label: 'Ocean Blue' },
    { value: 'gradient-3', label: 'Sunset' },
    { value: 'gradient-4', label: 'Purple Haze' },
    { value: 'gradient-5', label: 'Deep Blue' },
    { value: '#1a1a2e', label: 'Dark Blue' },
    { value: '#2c3e50', label: 'Midnight Blue' },
    { value: '#16213e', label: 'Navy Blue' },
    { value: '#27272a', label: 'Dark Gray' },
  ];

  // Font options
  const fontOptions = [
    { value: 'Inter, sans-serif', label: 'Inter (Default)' },
    { value: 'Roboto, sans-serif', label: 'Roboto' },
    { value: 'Poppins, sans-serif', label: 'Poppins' },
    { value: 'Montserrat, sans-serif', label: 'Montserrat' },
    { value: 'Open Sans, sans-serif', label: 'Open Sans' },
    { value: 'monospace', label: 'Monospace' },
  ];

  // Font size options
  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium (Default)' },
    { value: 'large', label: 'Large' },
    { value: 'x-large', label: 'Extra Large' },
  ];

  // Font color options
  const fontColorOptions = [
    { value: 'default', label: 'Default' },
    { value: '#ffffff', label: 'White' },
    { value: '#e2e8f0', label: 'Light Gray' },
    { value: '#90cdf4', label: 'Light Blue' },
    { value: '#9ae6b4', label: 'Light Green' },
    { value: '#fbd38d', label: 'Light Yellow' },
    { value: '#feb2b2', label: 'Light Red' },
    { value: '#d6bcfa', label: 'Light Purple' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-white/10 hover:bg-white/20 text-white fixed bottom-4 right-4 z-50 shadow-lg"
          title="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] bg-background text-foreground p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Appearance Settings</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Customize the look and feel of the application.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="theme" className="mt-4">
          <TabsList className={`grid ${isMobile ? 'grid-cols-2 gap-1 mb-2' : 'grid-cols-4 mb-4'}`}>
            <TabsTrigger value="theme" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2">
              <Moon className="h-4 w-4" />
              <span className={isMobile ? "text-xs" : "text-sm"}>Theme</span>
            </TabsTrigger>
            <TabsTrigger value="background" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2">
              <Palette className="h-4 w-4" />
              <span className={isMobile ? "text-xs" : "text-sm"}>Background</span>
            </TabsTrigger>
            <TabsTrigger value="font" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2">
              <Type className="h-4 w-4" />
              <span className={isMobile ? "text-xs" : "text-sm"}>Font</span>
            </TabsTrigger>
            <TabsTrigger value="reset" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2">
              <span className={isMobile ? "text-xs" : "text-sm"}>Reset</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="space-y-4 mt-2 sm:mt-4">
            <div className="space-y-2 sm:space-y-4">
              <Label className="text-sm sm:text-base">Theme Mode</Label>
              <RadioGroup
                value={settings.theme}
                onValueChange={(value) => updateSettings({ theme: value as 'light' | 'dark' })}
                className="grid grid-cols-2 gap-2 sm:gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="light"
                    id="theme-light"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-2 sm:p-4 hover:bg-gray-100 hover:text-gray-900 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Sun className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-gray-900" />
                    <span className="text-xs sm:text-sm text-gray-900">Light</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    value="dark"
                    id="theme-dark"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-gray-950 p-2 sm:p-4 hover:bg-gray-900 hover:text-gray-50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Moon className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-gray-50" />
                    <span className="text-xs sm:text-sm text-gray-50">Dark</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="background" className="space-y-2 sm:space-y-4 mt-2 sm:mt-4">
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-sm sm:text-base">Background Style</Label>
              <Select
                value={settings.background}
                onValueChange={(value) => updateSettings({ background: value })}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  {backgroundOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                          style={{
                            background: option.value.startsWith('gradient')
                              ? 'linear-gradient(to right, #1a1a2e, #0f3460)'
                              : option.value,
                          }}
                        />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-2 sm:mt-4`}>
              {backgroundOptions.map((option) => (
                <div
                  key={option.value}
                  className={`h-12 sm:h-16 rounded-md cursor-pointer flex items-center justify-center transition-all ${
                    settings.background === option.value
                      ? 'ring-2 ring-primary'
                      : 'ring-1 ring-border hover:ring-2 hover:ring-primary/50'
                  }`}
                  style={{
                    background: option.value.startsWith('gradient')
                      ? 'linear-gradient(to right, #1a1a2e, #0f3460)'
                      : option.value,
                  }}
                  onClick={() => updateSettings({ background: option.value })}
                >
                  {settings.background === option.value && (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="font" className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-sm sm:text-base">Font Family</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSettings({ fontFamily: value })}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs sm:text-sm">
                      <span style={{ fontFamily: option.value }}>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label className="text-sm sm:text-base">Font Size</Label>
              <Select
                value={settings.fontSize}
                onValueChange={(value) => updateSettings({ fontSize: value })}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {fontSizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs sm:text-sm">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label className="text-sm sm:text-base">Font Color</Label>
              <Select
                value={settings.fontColor}
                onValueChange={(value) => updateSettings({ fontColor: value })}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {fontColorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        {option.value !== 'default' && (
                          <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                            style={{ background: option.value }}
                          />
                        )}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-2 mt-2 sm:mt-4`}>
              {fontColorOptions.map((option) => (
                <div
                  key={option.value}
                  className={`h-6 sm:h-8 rounded-md cursor-pointer flex items-center justify-center transition-all ${
                    settings.fontColor === option.value
                      ? 'ring-2 ring-primary'
                      : 'ring-1 ring-border hover:ring-2 hover:ring-primary/50'
                  }`}
                  style={{
                    background: option.value === 'default' ? '#666' : option.value,
                  }}
                  onClick={() => updateSettings({ fontColor: option.value })}
                >
                  {settings.fontColor === option.value && (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reset" className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
            <div className="space-y-3 sm:space-y-4 text-center">
              <p className="text-xs sm:text-sm">Reset all appearance settings to their default values.</p>
              <Button 
                variant="destructive" 
                onClick={() => {
                  resetSettings();
                  setOpen(false);
                }}
                className="text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
              >
                Reset All Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
