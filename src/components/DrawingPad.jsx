import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pencil, Eraser, ZoomIn, ZoomOut, Undo2, Redo2, Trash2, Hand, Check, Image as ImageIcon, X } from 'lucide-react';

const DrawingPad = forwardRef(({ 
  initialData,
  backgroundImageSrc,
  onSave,
  aspectRatio = 4 / 3,
  baseWidth = 2000, 
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lineWidth, setLineWidth] = useState(4); 
  const [scale, setScale] = useState(1); 
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const minScale = 0.2;
  const maxScale = 3.0;
  
  const strokesRef = useRef([]);
  const imagesRef = useRef([]);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const currentStrokeRef = useRef([]);
  const rafId = useRef(null);
  const backgroundImageRef = useRef(null);
  const lastSavedDataRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartOffsetRef = useRef({ x: 0, y: 0 });

  // --- Предустановленные цвета ---
  const presetColors = [
    '#000000', // Черный
    '#EF4444', // Красный
    '#3B82F6', // Синий
    '#22C55E', // Зеленый
    '#EAB308', // Желтый
  ];

  const baseHeight = baseWidth / aspectRatio;

  // --- Функция ограничения панорамирования ---
  const clampPanOffset = useCallback((offset) => {
    const container = containerRef.current;
    if (!container) return offset;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const canvasWidth = baseWidth * scale;
    const canvasHeight = baseHeight * scale;

    const maxX = Math.max(0, canvasWidth - containerWidth);
    const maxY = Math.max(0, canvasHeight - containerHeight);

    if (canvasWidth <= containerWidth && canvasHeight <= containerHeight) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.max(0, Math.min(maxX, offset.x)),
      y: Math.max(0, Math.min(maxY, offset.y))
    };
  }, [scale, baseWidth, baseHeight]);

  // --- render ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const canvasWidth = baseWidth * scale;
    const canvasHeight = baseHeight * scale;
    
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    if (canvas.width !== baseWidth * dpr || canvas.height !== baseHeight * dpr) {
      canvas.width = baseWidth * dpr;
      canvas.height = baseHeight * dpr;
    }
    
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    
    const clampedOffset = clampPanOffset(panOffset);
    ctx.translate(-clampedOffset.x, -clampedOffset.y);
    
    // Белый фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);
    
    // Рисуем фоновое изображение (если есть) - НЕ растягиваем, а вставляем как есть
    if (backgroundImageRef.current) {
      const img = backgroundImageRef.current;
      // Вставляем в центр с сохранением пропорций
      const imgAspect = img.width / img.height;
      let drawWidth, drawHeight;
      
      if (imgAspect > baseWidth / baseHeight) {
        drawWidth = baseWidth;
        drawHeight = baseWidth / imgAspect;
      } else {
        drawHeight = baseHeight;
        drawWidth = baseHeight * imgAspect;
      }
      
      const x = (baseWidth - drawWidth) / 2;
      const y = (baseHeight - drawHeight) / 2;
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
    }
    
    // Рисуем вставленные изображения
    imagesRef.current.forEach(imgData => {
      if (imgData.image) {
        ctx.drawImage(imgData.image, imgData.x, imgData.y, imgData.width, imgData.height);
      }
    });
    
    // Рисуем штрихи
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
  }, [scale, baseWidth, baseHeight, panOffset, clampPanOffset]);

  // --- Сохранение полного состояния в историю ---
  const pushFullStateToHistory = useCallback(() => {
    const state = {
      strokes: JSON.parse(JSON.stringify(strokesRef.current)),
      images: JSON.parse(JSON.stringify(imagesRef.current))
    };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.stringify(state));
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // --- Обновленная функция установки панорамирования с ограничением ---
  const setPanOffsetWithClamp = useCallback((newOffset) => {
    const clamped = clampPanOffset(newOffset);
    setPanOffset(clamped);
  }, [clampPanOffset]);

  // --- triggerSave ---
  const triggerSave = useCallback(() => {
    if (!canvasRef.current) return null;
    const dataUrl = canvasRef.current.toDataURL();
    lastSavedDataRef.current = dataUrl;
    if (onSave) onSave(dataUrl);
    return dataUrl;
  }, [onSave]);

  // --- pushToHistory ---
  const pushToHistory = useCallback((strokes) => {
    const state = {
      strokes: JSON.parse(JSON.stringify(strokes)),
      images: JSON.parse(JSON.stringify(imagesRef.current))
    };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.stringify(state));
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // --- undo / redo ---
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const state = JSON.parse(historyRef.current[historyIndexRef.current]);
      strokesRef.current = state.strokes || [];
      imagesRef.current = state.images || [];
      render();
      triggerSave();
    }
  }, [render, triggerSave]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const state = JSON.parse(historyRef.current[historyIndexRef.current]);
      strokesRef.current = state.strokes || [];
      imagesRef.current = state.images || [];
      render();
      triggerSave();
    }
  }, [render, triggerSave]);

  // --- Вставка изображения ---
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Вычисляем размеры для вставки
        // Ограничиваем до 300px по большей стороне (можно изменить)
        const MAX_SIZE = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            width = MAX_SIZE;
            height = (img.height / img.width) * MAX_SIZE;
          } else {
            height = MAX_SIZE;
            width = (img.width / img.height) * MAX_SIZE;
          }
        }

        // Вставляем в центр видимой области
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          // Центрируем относительно видимой области с учетом панорамирования
          const scaleX = baseWidth / (rect.width * scale);
          const scaleY = baseHeight / (rect.height * scale);
          
          const centerX = (rect.width / 2) * scaleX + panOffset.x;
          const centerY = (rect.height / 2) * scaleY + panOffset.y;
          
          imagesRef.current.push({
            image: img,
            x: centerX - width / 2,
            y: centerY - height / 2,
            width: width,
            height: height,
            originalWidth: img.width,
            originalHeight: img.height
          });
          
          pushFullStateToHistory();
          render();
          triggerSave();
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Сброс input
  }, [panOffset, pushFullStateToHistory, render, triggerSave, scale, baseWidth, baseHeight]);

  // --- Удаление последнего изображения ---
  const removeLastImage = useCallback(() => {
    if (imagesRef.current.length > 0) {
      imagesRef.current.pop();
      pushFullStateToHistory();
      render();
      triggerSave();
    }
  }, [pushFullStateToHistory, render, triggerSave]);

  // --- Очистка всех изображений ---
  const clearImages = useCallback(() => {
    if (imagesRef.current.length > 0) {
      imagesRef.current = [];
      pushFullStateToHistory();
      render();
      triggerSave();
    }
  }, [pushFullStateToHistory, render, triggerSave]);

  // --- Получение логических координат с учетом панорамирования ---
  const getLogicalPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / (dpr * rect.width);
    const scaleY = canvas.height / (dpr * rect.height);
    
    const clampedOffset = clampPanOffset(panOffset);
    const x = (canvasX * scaleX) + clampedOffset.x;
    const y = (canvasY * scaleY) + clampedOffset.y;

    return { x, y };
  };

  // --- Получение координат для панорамирования ---
  const getPanPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / (dpr * rect.width);
    const scaleY = canvas.height / (dpr * rect.height);

    return { 
      x: canvasX * scaleX, 
      y: canvasY * scaleY 
    };
  };

  // --- useEffect для рендера ---
  useEffect(() => {
    render();
  }, [render]);

  // --- useEffect для фона ---
  useEffect(() => {
    const source = backgroundImageSrc || initialData;
    if (!source) return;

    if (source === lastSavedDataRef.current) return;

    const img = new Image();
    img.onload = () => {
      backgroundImageRef.current = img;
      render();
    };
    img.src = source;
  }, [backgroundImageSrc, initialData, render]);

  // --- Инициализация истории ---
  useEffect(() => {
    if (strokesRef.current.length === 0 && imagesRef.current.length === 0 && historyRef.current.length === 0) {
      pushFullStateToHistory();
    }
  }, [pushFullStateToHistory]);

  // --- Обработчики мыши / касаний ---
  const handlePointerDown = (e) => {
    if (tool === 'hand') {
      e.preventDefault();
      isPanning.current = true;
      const pos = getPanPos(e);
      panStartRef.current = pos;
      panStartOffsetRef.current = { ...panOffset };
    } else {
      startDraw(e);
    }
  };

  const handlePointerMove = (e) => {
    if (tool === 'hand' && isPanning.current) {
      e.preventDefault();
      const pos = getPanPos(e);
      const dx = pos.x - panStartRef.current.x;
      const dy = pos.y - panStartRef.current.y;
      
      const newOffset = {
        x: panStartOffsetRef.current.x - dx,
        y: panStartOffsetRef.current.y - dy
      };
      
      setPanOffsetWithClamp(newOffset);
    } else if (tool !== 'hand') {
      draw(e);
    }
  };

  const handlePointerUp = (e) => {
    if (tool === 'hand' && isPanning.current) {
      e.preventDefault();
      isPanning.current = false;
    } else if (tool !== 'hand') {
      endDraw(e);
    }
  };

  const handlePointerLeave = (e) => {
    if (tool === 'hand') {
      isPanning.current = false;
    } else {
      endDraw(e);
    }
  };

  // --- Оригинальные обработчики рисования ---
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
      
      const clampedOffset = clampPanOffset(panOffset);
      ctx.translate(-clampedOffset.x, -clampedOffset.y);
      
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
      pushToHistory(strokesRef.current);
    }
    currentStrokeRef.current = [];
    render();
    triggerSave();
  };

  // --- Зум только по кнопкам ---
  const zoomIn = () => {
    const newScale = Math.min(scale + 0.1, maxScale);
    setScale(newScale);
    setTimeout(() => {
      setPanOffsetWithClamp(panOffset);
    }, 0);
  };
  
  const zoomOut = () => {
    const newScale = Math.max(scale - 0.1, minScale);
    setScale(newScale);
    setTimeout(() => {
      setPanOffsetWithClamp(panOffset);
    }, 0);
  };
  
  const resetPan = () => setPanOffsetWithClamp({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    save: triggerSave,
    clear: clearCanvas,
    undo: undo,
    redo: redo,
    resetPan: resetPan,
    addImage: () => fileInputRef.current?.click(),
    removeLastImage: removeLastImage,
    clearImages: clearImages,
  }));

  // --- Очистка ---
  const clearCanvas = () => {
    strokesRef.current = [];
    imagesRef.current = [];
    currentStrokeRef.current = [];
    pushFullStateToHistory();
    render();
    triggerSave();
  };

  // --- Обработчик горячих клавиш ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'h' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTool('hand');
      }
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTool('pen');
      }
      if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (presetColors[index]) {
          setColor(presetColors[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvasWidth = baseWidth * scale;
  const canvasHeight = baseHeight * scale;

  return (
    <div ref={containerRef} className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-slate-200 flex-wrap z-10">
        <button
          onClick={() => setTool('pen')}
          className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
          title="Карандаш (P)"
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
        <button
          onClick={() => setTool('hand')}
          className={`p-2 rounded-xl transition-all ${tool === 'hand' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
          title="Рука для перемещения (H)"
        >
          <Hand size={16} />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        
        {/* Красивый выбор цветов */}
        <div className="flex items-center gap-1.5">
          {presetColors.map((presetColor, index) => (
            <button
              key={presetColor}
              onClick={() => setColor(presetColor)}
              className={`relative w-7 h-7 rounded-full transition-all duration-200 hover:scale-110 ${
                color === presetColor ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:ring-2 hover:ring-offset-2 hover:ring-slate-300'
              }`}
              style={{ backgroundColor: presetColor }}
              title={`Цвет ${index + 1} (${index + 1})`}
            >
              {color === presetColor && (
                <Check size={12} className="absolute inset-0 m-auto text-white" />
              )}
            </button>
          ))}
          
          {/* Кнопка выбора своего цвета */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 hover:border-blue-400 transition-all flex items-center justify-center text-slate-400 hover:text-blue-500 hover:scale-110 transition-all"
              title="Выбрать свой цвет"
            >
              <span className="text-lg leading-none">+</span>
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-white rounded-xl shadow-lg border border-slate-200 z-20">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setShowColorPicker(false);
                  }}
                  className="w-10 h-10 rounded-lg border-0 p-0 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        <div className="w-px h-6 bg-slate-200" />
        
        {/* Кнопка вставки изображения */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all"
          title="Вставить изображение"
        >
          <ImageIcon size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {/* Кнопки управления изображениями */}
        {imagesRef.current.length > 0 && (
          <>
            <button
              onClick={removeLastImage}
              className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
              title="Удалить последнее изображение"
            >
              <X size={16} />
            </button>
            <button
              onClick={clearImages}
              className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-[10px] font-bold"
              title="Очистить все изображения"
            >
              🗑️
            </button>
          </>
        )}
        
        <div className="w-px h-6 bg-slate-200" />
        
        <input
          type="range"
          min={1}
          max={20}
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          className="w-16 h-1 accent-blue-500"
          title="Толщина"
        />
        <span className="text-[10px] font-mono text-slate-400 min-w-[1.5rem]">
          {lineWidth}
        </span>
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
        <button
          onClick={resetPan}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 transition-all text-xs font-bold"
          title="Сбросить позицию"
        >
          ⊞
        </button>
        <div className="w-px h-6 bg-slate-200" />
        
        <button
          onClick={undo}
          disabled={historyIndexRef.current <= 0}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Отменить (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>

        <button
          onClick={redo}
          disabled={historyIndexRef.current >= historyRef.current.length - 1}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Вернуть (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <button
          onClick={clearCanvas}
          className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all ml-auto"
          title="Очистить всё"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      {/* Контейнер с холстом в верхнем левом углу */}
      <div 
        ref={containerRef}
        className="w-full overflow-hidden bg-slate-100 relative" 
        style={{ minHeight: '500px', maxHeight: '75vh' }}
      >
        <canvas
          ref={canvasRef}
          className="touch-none bg-white shadow-md"
          style={{ 
            display: 'block',
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            cursor: tool === 'hand' ? 'grab' : 'crosshair',
            flexShrink: 0,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerLeave}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>
    </div>
  );
});

export default React.memo(DrawingPad);