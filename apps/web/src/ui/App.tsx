import styles from './App.module.css';
import { GlyphDefs } from './Glyphs.js';
import Help from './Help.js';
import Home from './Home.js';
import Play from './Play.js';
import { useAttractMode } from './useAttractMode.js';
import { useKeyClick } from './useKeyClick.js';
import { useRoute } from './useRoute.js';

export default function App() {
  const route = useRoute();
  useAttractMode();
  useKeyClick();

  return (
    <main className={styles.screen}>
      <GlyphDefs />
      {route.name === 'home' ? (
        <Home />
      ) : route.name === 'help' ? (
        <Help />
      ) : (
        <Play code={route.code} />
      )}
    </main>
  );
}
