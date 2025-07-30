import GameBoard from '@/components/game/game-board';
import { SettingsProvider } from '@/hooks/use-settings';
import { StatsProvider } from '@/hooks/use-stats';

export default function Home() {
  return (
    <SettingsProvider>
      <StatsProvider>
        <GameBoard />
      </StatsProvider>
    </SettingsProvider>
  );
}
