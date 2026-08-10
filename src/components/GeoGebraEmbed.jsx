import React from 'react';

/**
 * GeoGebraEmbed — renders an interactive GeoGebra applet from commands.
 * 
 * Props:
 *   geogebra: { commands: ["A=(0,0)", "B=(4,0)", "Polygon(A,B,C)"] }
 *   width: number (default 600)
 *   height: number (default 400)
 * 
 * Usage:
 *   <GeoGebraEmbed geogebra={hintResponse.geogebra} />
 * 
 * Uses GeoGebra API: https://www.geogebra.org/apps/embed
 * The 'commands' execute in order via the JavaScript API.
 */
export default function GeoGebraEmbed({ geogebra, width = 600, height = 400 }) {
  const containerRef = React.useRef(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!geogebra?.commands?.length || !containerRef.current) return;

    // Build JSON params for the applet
    const params = {
      width,
      height,
      showMenuBar: false,
      showAlgebraInput: false,
      showToolBar: true,
      showToolBarHelp: false,
      showResetIcon: true,
      enableLabelDrags: false,
      enableShiftDragZoom: true,
      enableRightClick: false,
      appName: 'geometry',
      language: 'ru',
      borderColor: '#ffffff',
    };

    const base64Params = btoa(JSON.stringify(params));
    const url = `https://www.geogebra.org/apps/embed/${base64Params}`;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.width = width;
    iframe.height = height;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '1rem';
    iframe.allowFullscreen = true;
    iframe.title = 'GeoGebra construction';

    // Wait for load then execute commands
    iframe.onload = () => {
      const commands = geogebra.commands.join('\n');
      iframe.contentWindow?.postMessage({
        type: 'eval',
        command: commands,
      }, 'https://www.geogebra.org');
      setLoaded(true);
    };

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(iframe);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [geogebra, width, height]);

  if (!geogebra?.commands?.length) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
          📐 GeoGebra {loaded && '✓'}
        </span>
        <span className="text-[8px] font-bold text-slate-400">
          {geogebra.commands.length} команд
        </span>
      </div>
      <div ref={containerRef} className="flex items-center justify-center">
        <div className="text-[10px] font-bold text-slate-400 py-8">Загрузка GeoGebra...</div>
      </div>
    </div>
  );
}