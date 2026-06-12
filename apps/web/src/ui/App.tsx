import styles from './App.module.css';
import Home from './Home.js';
import PlayTable from './PlayTable.js';
import { useAttractMode } from './useAttractMode.js';
import { useRoute } from './useRoute.js';

export default function App() {
  const route = useRoute();
  useAttractMode();

  return (
    <main className={styles.screen}>
      {route.name === 'home' ? <Home /> : <PlayTable code={route.code} />}
    </main>
  );
}
