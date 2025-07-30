import GameBoard from '@/components/game/game-board';
import { SettingsProvider } from '@/hooks/use-settings';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <SettingsProvider>
        <GameBoard />
      </SettingsProvider>
    </main>
  );
}
