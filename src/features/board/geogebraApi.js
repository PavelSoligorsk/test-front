let scriptPromise = null;

export function loadGeoGebraScript() {
  if (typeof window !== 'undefined' && window.GGBApplet) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.geogebra.org/apps/deployggb.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('GeoGebra не загрузилась'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function readGeoGebraBase64(api) {
  if (!api?.getBase64) return Promise.resolve('');
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(typeof value === 'string' ? value : '');
    };
    try {
      const sync = api.getBase64((value) => finish(value));
      if (typeof sync === 'string') finish(sync);
      setTimeout(() => finish(''), 4000);
    } catch {
      finish('');
    }
  });
}
