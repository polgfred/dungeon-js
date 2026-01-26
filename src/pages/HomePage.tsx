import TitleScreen from '../ui/TitleScreen.js';

type HomePageProps = {
  onBeginSetup: () => void;
  setupHref: string;
};

export default function HomePage({ onBeginSetup, setupHref }: HomePageProps) {
  return <TitleScreen setupHref={setupHref} onStart={onBeginSetup} />;
}
