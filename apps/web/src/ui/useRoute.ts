import { useEffect, useState } from 'react';

export type Route = { name: 'home' } | { name: 'play'; code: string };

function parse(pathname: string): Route {
  const match = pathname.match(/^\/play\/([^/]+)\/?$/);
  if (match) return { name: 'play', code: decodeURIComponent(match[1]) };
  return { name: 'home' };
}

/** Navigate without a reload; dispatches popstate so useRoute() re-reads. */
export function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parse(window.location.pathname)
  );
  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
