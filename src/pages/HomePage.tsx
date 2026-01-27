import TitleScreen from '../ui/TitleScreen.js';

type HomePageProps = {
  onBeginSetup: () => void;
  hasSave: boolean;
  onContinue: () => void;
};

export default function HomePage({
  onBeginSetup,
  hasSave,
  onContinue,
}: HomePageProps) {
  return (
    <TitleScreen
      onStart={onBeginSetup}
      hasSave={hasSave}
      onContinue={onContinue}
    />
  );
}
