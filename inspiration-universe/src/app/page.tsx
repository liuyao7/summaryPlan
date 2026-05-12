'use client';

  import { useAppStore } from '@/lib/store';
  import BirthdayInput from '@/components/BirthdayInput';
  import LoadingScreen from '@/components/LoadingScreen';
  import SpaceMode from '@/components/SpaceMode';
  import SceneMode from '@/components/SceneMode';
  import AIResultDisplay from '@/components/AIResultDisplay';
  import ModeSwitcher from '@/components/ModeSwitcher';

  export default function Home() {
    const { currentMode, loading, aiResult } = useAppStore();

    if (loading) {
      return <LoadingScreen />;
    }

    if (currentMode === 'input') {
      return <BirthdayInput />;
    }

    if (currentMode === 'space') {
      return (
        <div className="relative w-full h-screen">
          <SpaceMode themeColor={aiResult?.themeColors[0]} />
          <div className="absolute top-4 right-4 z-10">
            <ModeSwitcher />
          </div>
          {aiResult && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <AIResultDisplay />
            </div>
          )}
        </div>
      );
    }

    if (currentMode === 'scene') {
      return (
        <div className="relative w-full h-screen">
          <SceneMode />
          <div className="absolute top-4 right-4 z-10">
            <ModeSwitcher />
          </div>
          {aiResult && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <AIResultDisplay />
            </div>
          )}
        </div>
      );
    }

    return null;
  }