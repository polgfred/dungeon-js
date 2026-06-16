import styles from './App.module.css';
import Home from './Home.js';
import Play from './Play.js';
import { useAttractMode } from './useAttractMode.js';
import { useRoute } from './useRoute.js';

export default function App() {
  const route = useRoute();
  useAttractMode();

  return (
    <main className={styles.screen}>
      {route.name === 'home' ? <Home /> : <Play code={route.code} />}
    </main>
  );
}
