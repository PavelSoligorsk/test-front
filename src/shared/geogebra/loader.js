// deployggb.js грузится один раз и только там, где есть чертёж: остальное
// приложение не ждёт geogebra.org при старте.
const SCRIPT_URL = 'https://www.geogebra.org/apps/deployggb.js';
const SCRIPT_ID = 'ggb-api-script';

let pending = null;

export function loadGeoGebra() {
  if (typeof window === 'undefined') return Promise.reject(new Error('GeoGebra доступна только в браузере'));
  if (typeof window.GGBApplet === 'function') return Promise.resolve(window.GGBApplet);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const done = () => {
      if (typeof window.GGBApplet === 'function') resolve(window.GGBApplet);
      else fail();
    };
    const fail = () => {
      pending = null;
      document.getElementById(SCRIPT_ID)?.remove();
      reject(new Error('GeoGebra не загрузилась'));
    };
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', done, { once: true });
      existing.addEventListener('error', fail, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = done;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return pending;
}
