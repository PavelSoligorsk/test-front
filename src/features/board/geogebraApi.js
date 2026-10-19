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

export function readGeoGebraPerspective(api) {
  if (typeof api?.getPerspectiveXML !== 'function') return '';
  try {
    const xml = api.getPerspectiveXML();
    return typeof xml === 'string' ? xml : '';
  } catch {
    return '';
  }
}

export function applyGeoGebraPerspective(api, xml) {
  if (!api || !xml || typeof api.setPerspective !== 'function') return false;
  try {
    api.setPerspective(xml);
    return true;
  } catch {
    return false;
  }
}

export function readGeoGebraXml(api) {
  if (typeof api?.getXML !== 'function') return '';
  try {
    const xml = api.getXML();
    return typeof xml === 'string' ? xml : '';
  } catch {
    return '';
  }
}

function hexToRgb(hex) {
  const raw = String(hex || '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

export function runTheorySetup(api, setup) {
  if (!api || !setup) return;
  const commands = String(setup)
    .split('\n')
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd && !cmd.startsWith('//') && !cmd.startsWith('#'));
  const delayed = [];
  commands.forEach((cmd) => {
    if (cmd.startsWith('view:')) {
      const parts = cmd.slice(5).split(',').map((item) => item.trim());
      if (parts.length >= 4) {
        const box = parts.slice(0, 4).map((item) => parseFloat(item));
        if (parts.length >= 6) api.setCoordSystem(...box, parseFloat(parts[4]) || -10, parseFloat(parts[5]) || 10);
        else api.setCoordSystem(...box);
        if (parts.includes('grid')) api.setGridVisible(true);
        if (parts.includes('axes')) api.setAxesVisible(true, true);
      }
      return;
    }
    const perspectiveCall = cmd.match(/^SetPerspective\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)$/i);
    if (perspectiveCall || cmd.startsWith('perspective:')) {
      const code = perspectiveCall
        ? (perspectiveCall[1] || perspectiveCall[2] || perspectiveCall[3] || '').trim()
        : cmd.slice(12).trim();
      if (code) {
        try { api.setPerspective(code); } catch { /* вид не сменился */ }
      }
      return;
    }
    if (cmd.startsWith('color:') || cmd.startsWith('size:') || cmd.startsWith('label:') || cmd.startsWith('show:') || cmd.startsWith('hide:') || cmd.startsWith('animate:')) {
      delayed.push(cmd);
      return;
    }
    try { api.evalCommand(cmd); } catch { /* команда не выполнилась */ }
  });
  if (!delayed.length) return;
  window.setTimeout(() => {
    delayed.forEach((cmd) => {
      try {
        if (cmd.startsWith('color:')) {
          const match = cmd.match(/color:\s*(\w+)\s*,\s*([\w#]+)/);
          if (match) api.setColor(match[1], ...hexToRgb(match[2]));
        } else if (cmd.startsWith('size:')) {
          const match = cmd.match(/size:\s*(\w+)\s*,\s*(\d+)/);
          if (match) api.setPointSize(match[1], parseInt(match[2], 10));
        } else if (cmd.startsWith('label:')) {
          const match = cmd.match(/label:\s*(\w+)\s*,\s*"([^"]+)"/);
          if (match) api.setCaption(match[1], match[2]);
        } else if (cmd.startsWith('show:') || cmd.startsWith('hide:')) {
          const visible = cmd.startsWith('show:');
          cmd.slice(5).split(',').map((item) => item.trim()).forEach((item) => {
            if (item === 'grid') api.setGridVisible(visible);
            else if (item === 'axes') api.setAxesVisible(visible, visible);
            else api.setVisible(item, visible);
          });
        } else if (cmd.startsWith('animate:')) {
          const match = cmd.match(/animate:\s*(\w+)\s*,\s*(\w+)\s*,?\s*(\d+)?/);
          if (!match) return;
          const on = match[2] === 'true';
          api.setAnimating(match[1], on);
          if (on) api.startAnimation();
          else api.stopAnimation();
          if (match[3]) api.setAnimationSpeed(match[1], parseFloat(match[3]));
        }
      } catch { /* оформление не применилось */ }
    });
  }, 200);
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
