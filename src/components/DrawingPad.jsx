import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pencil, Eraser, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

const DrawingPad = forwardRef(({ 
  initialData, 
  onSave,
  aspectRatio = 4 / 3,
  baseWidth = 2000, // Большое базовое разрешение холста для свободного рисования
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4); // Чуть увеличим базовую толщину для большого холста
  const [scale, setScale] = useState(0.5); // Стартуем с 0.5 (50%), чтобы видеть больше полотна на старте
  const minScale = 0.2;
  const maxScale = 3.0;
  
  const strokesRef = useRef([]);
  const isDrawing = useRef(false);
  const currentStrokeRef = useRef([]);
  const rafId = useRef(null);
  const backgroundImageRef = useRef(null);

  // Вычисляем базовую высоту на основе пропорций
  const baseHeight = baseWidth / aspectRatio;

  // --- Хелпер: точный перевод экранных координат в логические координаты холста ---
  const getLogicalPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Положение клика внутри CSS-размеров холста
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Переводим в систему координат самого canvas (0..baseWidth и 0..baseHeight)
    // Учитываем отношение реального разрешения к отображаемому CSS-размеру
    const x = (canvasX / rect.width) * baseWidth;
    const y = (canvasY / rect.height) * baseHeight;

    return { x, y };
  };

  // --- Отрисовка всего холста ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // 1. Управляем CSS-размерами холста через scale (для работы скролла в контейнере)
    canvas.style.width = `${baseWidth * scale}px`;
    canvas.style.height = `${baseHeight * scale}px`;

    // 2. Внутреннее разрешение холста всегда жесткое и четкое (умножаем базовое на DPR)
    if (canvas.width !== baseWidth * dpr || canvas.height !== baseHeight * dpr) {
      canvas.width = baseWidth * dpr;
      canvas.height = baseHeight * dpr;
    }
    
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    
    // Очищаем и заливаем белым фоном
    ctx.clearRect(0, 0, baseWidth, baseHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);
    
    // Фоновое изображение
    if (backgroundImageRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0, baseWidth, baseHeight);
    }
    
    // Отрисовка сохраненных штрихов
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

  // Перерисовка при изменении масштаба
  useEffect(() => {
    render();
  }, [render]);

  // Загрузка initialData
  useEffect(() => {
    if (!initialData) return;
    const img = new Image();
    img.onload = () => {
      backgroundImageRef.current = img;
      render();
    };
    img.src = initialData;
  }, [initialData, render]);

  // --- Методы рисования ---
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
      render(); // Рисуем базу
      
      // Рисуем текущую линию поверх
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
    
    if (onSave) {
      onSave(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    render();
    if (onSave) {
      onSave(canvasRef.current.toDataURL());
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, maxScale));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, minScale));

  useImperativeHandle(ref, () => ({
    save: () => {
      if (onSave) onSave(canvasRef.current.toDataURL());
    },
    clear: clearCanvas,
  }));

  return (
    <div ref={containerRef} className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      {/* Тулбар */}
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
          max={20} // Увеличили лимит толщины для большого разрешения
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
          onClick={clearCanvas}
          className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all ml-auto"
          title="Очистить всё"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      
      {/* Область для рисования со скроллом */}
      <div className="w-full overflow-auto bg-slate-100 relative select-none" style={{ minHeight: '500px', maxHeight: '75vh' }}>
        {/* Контейнер-центровщик с паддингами, чтобы края холста удобно скроллились */}
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