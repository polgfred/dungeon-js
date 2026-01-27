import TitleScreen from '../ui/TitleScreen.js';

type HomePageProps = {
  onBeginSetup: () => void;
  setupHref: string;
  hasSave: boolean;
  onContinue: () => void;
};

export default function HomePage({
  onBeginSetup,
  setupHref,
  hasSave,
  onContinue,
}: HomePageProps) {
  return (
    <TitleScreen
      setupHref={setupHref}
      onStart={onBeginSetup}
      hasSave={hasSave}
      onContinue={onContinue}
    />
  );
}
