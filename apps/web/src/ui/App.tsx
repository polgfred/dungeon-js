import styles from './App.module.css';
import Help from './Help.js';
import Home from './Home.js';
import Play from './Play.js';
import { useAttractMode } from './useAttractMode.js';
import { useRoute } from './useRoute.js';

export default function App() {
  const route = useRoute();
  useAttractMode();

  return (
    <main className={styles.screen}>
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
