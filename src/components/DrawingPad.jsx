import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pencil, Eraser, RotateCcw, ZoomIn, ZoomOut, Undo2, Trash2 } from 'lucide-react';

const DrawingPad = forwardRef(({ 
  initialData,
  backgroundImageSrc,
  onSave,
  aspectRatio = 4 / 3,
  baseWidth = 2000, 
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4); 
  const [scale, setScale] = useState(0.5); 
  const minScale = 0.2;
  const maxScale = 3.0;
  
  const strokesRef = useRef([]);
  const isDrawing = useRef(false);
  const currentStrokeRef = useRef([]);
  const rafId = useRef(null);
  const backgroundImageRef = useRef(null);
  
  // Реф для хранения последнего сохраненного результата (защита от зацикливания)
  const lastSavedDataRef = useRef(null);

  const baseHeight = baseWidth / aspectRatio;

  const getLogicalPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const x = (canvasX / rect.width) * baseWidth;
    const y = (canvasY / rect.height) * baseHeight;

    return { x, y };
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.style.width = `${baseWidth * scale}px`;
    canvas.style.height = `${baseHeight * scale}px`;

    if (canvas.width !== baseWidth * dpr || canvas.height !== baseHeight * dpr) {
      canvas.width = baseWidth * dpr;
      canvas.height = baseHeight * dpr;
    }
    
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, baseWidth, baseHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);
    
    if (backgroundImageRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0, baseWidth, baseHeight);
    }
    
    strokesRef.current.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [scale, baseWidth, baseHeight]);

  // --- Единая функция для сохранения состояния ---
  const triggerSave = useCallback(() => {
    if (!canvasRef.current) return null;
    const dataUrl = canvasRef.current.toDataURL();
    lastSavedDataRef.current = dataUrl; // Запоминаем, что мы отдали наружу
    if (onSave) onSave(dataUrl);
    return dataUrl;
  }, [onSave]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const source = backgroundImageSrc || initialData;
    if (!source) return;

    // ЗАЩИТА: Если родитель передал обратно ту же картинку, которую мы только что сами сгенерировали,
    // мы её игнорируем! Иначе нарисованные линии "впечатаются" в фон и их нельзя будет отменить.
    if (source === lastSavedDataRef.current) return;

    const img = new Image();
    img.onload = () => {
      backgroundImageRef.current = img;
      render();
    };
    img.src = source;
  }, [backgroundImageSrc, initialData, render]);

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getLogicalPos(e);
    currentStrokeRef.current = [pos];
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const pos = getLogicalPos(e);
    currentStrokeRef.current.push(pos);
    
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      render(); 
      
      const ctx = canvasRef.current.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      
      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const pts = currentStrokeRef.current;
      if (pts.length > 1) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
  };

  const endDraw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    
    if (currentStrokeRef.current.length > 1) {
      const stroke = {
        points: [...currentStrokeRef.current],
        color: tool === 'eraser' ? '#ffffff' : color,
        lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
      };
      strokesRef.current.push(stroke);
    }
    currentStrokeRef.current = [];
    render();
    triggerSave(); // Вызываем единую функцию сохранения
  };

  const undo = () => {
    if (strokesRef.current.length > 0) {
      strokesRef.current.pop();
      render();
      triggerSave();
    }
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    // Убрал очистку фона (backgroundImageRef.current = null). 
    // Теперь кнопка очищает только рисунки ученика, оставляя само задание на месте!
    render();
    triggerSave();
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, maxScale));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, minScale));

  useImperativeHandle(ref, () => ({
    save: triggerSave,
    clear: clearCanvas,
    undo: undo,
  }));

  return (
    <div ref={containerRef} className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-slate-200 flex-wrap z-10">
        <button
          onClick={() => setTool('pen')}
          className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
          title="Карандаш"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
          title="Ластик"
        >
          <Eraser size={16} />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer"
          title="Цвет"
        />
        <input
          type="range"
          min={1}
          max={20}
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          className="w-16 h-1 accent-blue-500"
          title="Толщина"
        />
        <div className="w-px h-6 bg-slate-200" />
        <button
          onClick={zoomOut}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 transition-all"
          title="Уменьшить"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-mono text-slate-500 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 transition-all"
          title="Увеличить"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        
        <button
          onClick={undo}
          disabled={strokesRef.current.length === 0}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all ml-auto"
          title="Шаг назад"
        >
          <Undo2 size={16} />
        </button>

        <button
          onClick={clearCanvas}
          className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          title="Очистить всё"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="w-full overflow-auto bg-slate-100 relative select-none" style={{ minHeight: '500px', maxHeight: '75vh' }}>
        <div className="w-max h-max p-12 flex items-center justify-center mx-auto min-w-full min-h-full">
          <canvas
            ref={canvasRef}
            className="touch-none bg-white shadow-md cursor-crosshair"
            style={{ display: 'block' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>
    </div>
  );
});

export default React.memo(DrawingPad);