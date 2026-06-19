import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { toast } from 'react-hot-toast';
import { Catalog } from '../types';
import {
  X, ChevronRight, ChevronLeft, Maximize, Minimize,
  Volume2, VolumeX, FileDown, DownloadCloud, ZoomIn, ZoomOut,
  Book, Smartphone, ChevronUp, ChevronDown, Highlighter, StickyNote,
  MousePointer2, Trash2, Check, Info, Share2, List, PackageOpen
} from 'lucide-react';
import SafeImage from './SafeImage';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { fireConfetti } from '../utils/confetti';
import { trackCatalogView } from '../utils/analytics';

interface BookViewerProps {
  catalog: Catalog;
  onClose: () => void;
  initialPage?: number;
  allCatalogs?: Catalog[];
  onOpenCatalog?: (catalog: Catalog) => void;
}

interface Annotation {
  id: string;
  type: 'highlight' | 'note';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  isOpen?: boolean;
}

const PAGE_FLIP_SOUND_URL = 'https://nafaspharmed.com/mp3/paper.mp3';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const getDistance = (touches: React.TouchList) =>
  Math.hypot(touches[0]!.clientX - touches[1]!.clientX, touches[0]!.clientY - touches[1]!.clientY);

// NoteItem component
interface NoteItemProps {
  ann: Annotation;
  isActive: boolean;
  layoutKey: number;
  onToggleActive: () => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ ann, isActive, layoutKey, onToggleActive, onUpdate, onDelete }) => {
  const [content, setContent] = useState(ann.content || '');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupRect, setPopupRect] = useState<{ left: number; top: number; openUp: boolean } | null>(null);

  useEffect(() => { setContent(ann.content ?? ''); }, [ann.content]);
  useEffect(() => {
    if (!isActive || !buttonRef.current) { setPopupRect(null); return; }
    const el = buttonRef.current;
    const rect = el.getBoundingClientRect();
    const popupHeight = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < popupHeight && rect.top > spaceBelow;
    setPopupRect({ left: rect.left + rect.width / 2, top: openUp ? rect.top : rect.bottom, openUp });
  }, [isActive, layoutKey]);

  const handleSave = useCallback(() => {
    if (content !== (ann.content ?? '')) onUpdate(ann.id, content);
  }, [content, ann.content, ann.id, onUpdate]);

  const handleClose = useCallback(() => { handleSave(); onToggleActive(); }, [handleSave, onToggleActive]);

  useEffect(() => {
    if (!isActive) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (document.querySelector('[data-note-popup]')?.contains(target)) return;
      onToggleActive();
    };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }, 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isActive, onToggleActive]);

  const popupContent = isActive && popupRect && ReactDOM.createPortal(
    <div
      data-note-popup
      style={{
        position: 'fixed',
        left: popupRect.left,
        top: popupRect.openUp ? popupRect.top - 160 : popupRect.top,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 200,
      }}
      className="bg-skin-card border border-skin-border rounded-xl shadow-xl p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        value={content}
        className="w-full h-20 p-2 text-xs bg-skin-control-bg border border-skin-border rounded-lg resize-none outline-none focus:border-skin-primary"
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleSave}
        autoFocus
      />
      <div className="flex justify-between mt-1">
        <button onClick={() => { onDelete(ann.id); onToggleActive(); }} className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-colors">
          <Trash2 size={12} />
        </button>
        <button onClick={handleClose} className="flex items-center gap-1 text-xs bg-skin-primary text-white px-2 py-1 rounded-lg">
          <Check size={10} /> ذخیره
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <button
      ref={buttonRef}
      onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
      className={`annotation-item p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95 ${isActive ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-500' : 'bg-yellow-200 text-yellow-700'}`}
      title="یادداشت"
    >
      <StickyNote size={12} />
      {typeof document !== 'undefined' && popupContent}
    </button>
  );
};

// AnnotationLayer
interface AnnotationLayerProps {
  pageIndex: number;
  isActivePage: boolean;
  activeTool: 'cursor' | 'highlight' | 'note';
  annotations: Annotation[];
  closeSignal: number;
  layoutKey: number;
  // REMAINING-09: Highlight color picker
  highlightColor: string;
  onAdd: (ann: Annotation) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

const getRelativeCoordsFromClient = (rect: DOMRect, clientX: number, clientY: number) => ({
  x: ((clientX - rect.left) / rect.width) * 100,
  y: ((clientY - rect.top) / rect.height) * 100,
});

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  pageIndex, isActivePage, activeTool, annotations, closeSignal, layoutKey, highlightColor, onAdd, onUpdate, onDelete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const addedNoteByTouchRef = useRef(false);
  const suppressNextCreateRef = useRef(false);

  const getRelativeCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0]!.clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0]!.clientY : (e as React.MouseEvent).clientY;
    return getRelativeCoordsFromClient(rect, clientX, clientY);
  }, []);

  const getEndCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0]!.clientX;
      clientY = e.changedTouches[0]!.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return getRelativeCoordsFromClient(rect, clientX, clientY);
  }, []);

  useEffect(() => { if (activeTool !== 'note') setActiveNoteId(null); }, [activeTool]);
  useEffect(() => { if (!isActivePage) { setActiveNoteId(null); setIsDrawing(false); } }, [isActivePage]);
  useEffect(() => { setActiveNoteId(null); setIsDrawing(false); }, [closeSignal]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ cursor: activeTool === 'cursor' ? 'default' : activeTool === 'highlight' ? 'crosshair' : 'cell' }}
      onMouseDown={(e) => {
        if (activeTool === 'cursor') return;
        e.stopPropagation();
        if (activeTool === 'highlight') {
          setIsDrawing(true);
          const coords = getRelativeCoords(e);
          setStartPoint(coords); setCurrentPoint(coords);
        }
      }}
      onMouseMove={(e) => {
        if (activeTool !== 'cursor') e.stopPropagation();
        if (!isDrawing) return;
        setCurrentPoint(getRelativeCoords(e));
      }}
      onMouseUp={(e) => {
        if (activeTool !== 'cursor') e.stopPropagation();
        if (isDrawing) {
          setIsDrawing(false);
          const endPoint = getEndCoords(e);
          const x = Math.min(startPoint.x, endPoint.x);
          const y = Math.min(startPoint.y, endPoint.y);
          const width = Math.abs(endPoint.x - startPoint.x);
          const height = Math.abs(endPoint.y - startPoint.y);
          if (width > 2 && height > 2) {
            onAdd({ id: Date.now().toString(), type: 'highlight', x, y, width, height, color: highlightColor });
          }
        }
      }}
      onClick={(e) => {
        if (activeTool === 'note') {
          e.stopPropagation();
          if (addedNoteByTouchRef.current) { addedNoteByTouchRef.current = false; return; }
          if (suppressNextCreateRef.current) { suppressNextCreateRef.current = false; return; }
          if (activeNoteId) { setActiveNoteId(null); suppressNextCreateRef.current = true; return; }
          if ((e.target as HTMLElement).closest('.annotation-item')) return;
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          const newId = Date.now().toString();
          onAdd({ id: newId, type: 'note', x, y, content: '', color: '#fef08a' });
          setActiveNoteId(newId);
        }
      }}
    >
      {annotations.map(ann => (
        <div
          key={ann.id}
          className="annotation-item absolute"
          style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: ann.width ? `${ann.width}%` : undefined, height: ann.height ? `${ann.height}%` : undefined }}
          onClick={(e) => { if (activeTool === 'cursor') { e.stopPropagation(); if (ann.type === 'note') setActiveNoteId(activeNoteId === ann.id ? null : ann.id); } }}
        >
          {ann.type === 'highlight' && (
            <div className="group relative w-full h-full rounded" style={{ backgroundColor: `${ann.color}60`, border: `1px solid ${ann.color}` }}>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={8} />
              </button>
            </div>
          )}
          {ann.type === 'note' && (
            <NoteItem
              ann={ann}
              isActive={activeNoteId === ann.id}
              layoutKey={layoutKey}
              onToggleActive={() => setActiveNoteId(activeNoteId === ann.id ? null : ann.id)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          )}
        </div>
      ))}
      {isDrawing && (
        <div
          className="absolute rounded pointer-events-none border-2 border-yellow-400"
          style={{
            left: `${Math.min(startPoint.x, currentPoint.x)}%`,
            top: `${Math.min(startPoint.y, currentPoint.y)}%`,
            width: `${Math.abs(currentPoint.x - startPoint.x)}%`,
            height: `${Math.abs(currentPoint.y - startPoint.y)}%`,
            backgroundColor: 'rgba(253, 224, 71, 0.3)',
          }}
        />
      )}
    </div>
  );
};

// Page components
const Page = React.forwardRef<HTMLDivElement, { number: number; children?: React.ReactNode }>(
  (props, ref) => (
    <div ref={ref} className="relative bg-white overflow-hidden select-none">
      {props.children}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">{props.number}</div>
    </div>
  )
);
Page.displayName = 'Page';

const PdfPage = React.forwardRef<HTMLDivElement, {
  doc: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  onRendered?: (dataUrl: string) => void;
  children?: React.ReactNode;
}>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let renderTask: ReturnType<pdfjsLib.PDFPageProxy['render']> | null = null;
    let isSetup = true;
    const renderPage = async () => {
      if (!props.doc) return;
      try {
        const page = await props.doc.getPage(props.pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || !isSetup) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        renderTask = page.render({ canvasContext: context, canvas: canvas, viewport });
        await renderTask.promise;
        if (isSetup) {
          setRendered(true);
          if (props.onRendered) props.onRendered(canvas.toDataURL('image/jpeg', 0.8));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };
    renderPage();
    return () => { isSetup = false; renderTask?.cancel(); };
  }, [props.doc, props.pageNumber]);

  return (
    <div ref={ref} className="relative bg-white overflow-hidden select-none">
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-xs text-gray-400">در حال تبدیل صفحه...</div>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-auto" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">{props.pageNumber}</div>
      {props.children}
    </div>
  );
});
PdfPage.displayName = 'PdfPage';

// Main BookViewer
const BookViewer: React.FC<BookViewerProps> = ({ catalog, onClose, initialPage = 0, allCatalogs = [], onOpenCatalog }) => {
  const bookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void; flip: (n: number) => void; pages: { length: number } } }>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const usePdfMode = !!catalog.pdfUrl && catalog.pages.length === 0;
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(usePdfMode);
  const [pdfError, setPdfError] = useState('');
  const [pdfThumbnails, setPdfThumbnails] = useState<Record<number, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [forceSinglePage, setForceSinglePage] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const hasToc = Array.isArray(catalog.toc) && catalog.toc.length > 0;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showTopPanel, setShowTopPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  // BUG-N07: Virtual rendering for thumbnails (show 13 at a time)
  const VIRTUAL_WINDOW_SIZE = 13;
  const [virtualStart, setVirtualStart] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [closeSignal, setCloseSignal] = useState(0);
  const [layoutKey, setLayoutKey] = useState(0);
  const [activeTool, setActiveTool] = useState<'cursor' | 'highlight' | 'note'>('cursor');
  // REMAINING-09: Annotation color picker
  const [highlightColor, setHighlightColor] = useState('#fde047');
  const HIGHLIGHT_COLORS = [
    { name: 'زرد', hex: '#fde047' },
    { name: 'سبز', hex: '#86efac' },
    { name: 'آبی', hex: '#93c5fd' },
    { name: 'صورتی', hex: '#f9a8d4' },
  ];
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});

  const gesture = useRef({
    startX: 0, startY: 0, startPanX: 0, startPanY: 0,
    startDist: 0, startZoom: 1,
    mode: 'none' as 'none' | 'swipe' | 'pan' | 'pinch',
  });

  // Fix 4.7: centralized scroll lock
  useBodyScrollLock(true);

  // Fix 3.5: Keyboard hint toast on first open
  useEffect(() => {
    const shown = localStorage.getItem('nafas_kb_hint_shown');
    if (!shown) {
      setTimeout(() => {
        toast('نکته: از کلیدهای ← → برای ورق زدن استفاده کنید.', { icon: '⌨️', duration: 4000 });
        localStorage.setItem('nafas_kb_hint_shown', '1');
      }, 1000);
    }
  }, []);

  // SURPRISE-S03: Fire confetti on first catalog open
  useEffect(() => {
    fireConfetti();
    // ARCH-01: Track this catalog view for analytics
    trackCatalogView(catalog.id, catalog.title);
  }, [catalog.id, catalog.title]);

  // Load PDF
  useEffect(() => {
    if (usePdfMode && catalog.pdfUrl) {
      setIsLoadingPdf(true);
      const loadingTask = pdfjsLib.getDocument(catalog.pdfUrl);
      loadingTask.promise.then(doc => {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setIsLoadingPdf(false);
      }).catch(err => {
        console.error('Error loading PDF:', err);
        setPdfError('خطا در دریافت کاتالوگ PDF');
        setIsLoadingPdf(false);
      });
      return () => { loadingTask.destroy(); };
    }
  }, [usePdfMode, catalog.pdfUrl]);

  // Load Annotations
  useEffect(() => {
    const saved = localStorage.getItem(`nafas_annotations_${catalog.id}`);
    if (saved) { try { setAnnotations(JSON.parse(saved)); } catch { /* ignore */ } }
  }, [catalog.id]);

  // Save Annotations
  useEffect(() => {
    if (Object.keys(annotations).length > 0) {
      localStorage.setItem(`nafas_annotations_${catalog.id}`, JSON.stringify(annotations));
    } else {
      localStorage.removeItem(`nafas_annotations_${catalog.id}`);
    }
  }, [annotations, catalog.id]);

  // Focus trap (Fix 1.10)
  const getFocusable = useCallback((root: HTMLElement): HTMLElement[] => {
    return Array.from(root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  }, []);

  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = getFocusable(root);
    (focusables[0] ?? root).focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = getFocusable(root);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); lastFocusedRef.current?.focus?.(); };
  }, [getFocusable, onClose]);

  const handleAddAnnotation = (pageIndex: number, ann: Annotation) => {
    setAnnotations(prev => ({ ...prev, [pageIndex]: [...(prev[pageIndex] || []), ann] }));
    if (ann.type === 'highlight') setActiveTool('cursor');
  };
  const handleUpdateAnnotation = (pageIndex: number, id: string, content: string) => {
    setAnnotations(prev => ({ ...prev, [pageIndex]: (prev[pageIndex] || []).map(a => a.id === id ? { ...a, content } : a) }));
  };
  const handleDeleteAnnotation = (pageIndex: number, id: string) => {
    setAnnotations(prev => {
      const pageAnns = (prev[pageIndex] || []).filter(a => a.id !== id);
      const next = { ...prev, [pageIndex]: pageAnns };
      if (pageAnns.length === 0) delete next[pageIndex];
      return next;
    });
  };

  useEffect(() => { setLayoutKey(k => k + 1); }, [zoomLevel, pan.x, pan.y, currentPage]);

  // Thumb strip scroll
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-thumb="${currentPage}"]`);
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); bookRef.current?.pageFlip()?.flipNext(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); bookRef.current?.pageFlip()?.flipPrev(); }
      // REMAINING-10: Toggle keyboard shortcuts panel with ? key
      else if (e.key === '?') { e.preventDefault(); setShowHelp(h => !h); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Audio & jump to page
  useEffect(() => {
    audioRef.current = new Audio(PAGE_FLIP_SOUND_URL);
    audioRef.current.volume = 0.4;
    if (initialPage > 0) {
      setTimeout(() => bookRef.current?.pageFlip().flip(initialPage), 500);
    }
  }, [initialPage]);

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const isSmallScreen = windowWidth < 768;
      setIsMobile(isSmallScreen);
      const isSingle = isSmallScreen || forceSinglePage;
      const availableWidth = Math.min(windowWidth * 0.95, isSingle ? 600 : 1100);
      const availableHeight = windowHeight * 0.78;
      const aspectRatio = 842 / 595;
      let bookWidth = isSingle ? Math.min(availableWidth, availableHeight / aspectRatio) : availableWidth / 2;
      let bookHeight = bookWidth * aspectRatio;
      if (bookHeight > availableHeight) { bookHeight = availableHeight; bookWidth = bookHeight / aspectRatio; }
      if (bookWidth > availableWidth) { bookWidth = availableWidth; bookHeight = bookWidth * aspectRatio; }
      setDimensions({ width: Math.floor(bookWidth), height: Math.floor(bookHeight) });
    };
    handleResize();
    // Fix 4.10: debounced resize
    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(handleResize, 150); };
    window.addEventListener('resize', debounced);
    return () => { window.removeEventListener('resize', debounced); clearTimeout(timer); };
  }, [forceSinglePage]);

  // Fullscreen handler
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Reset pan on zoom reset
  useEffect(() => { if (zoomLevel <= 1) setPan({ x: 0, y: 0 }); }, [zoomLevel]);

  const playSound = useCallback(() => {
    if (isSoundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [isSoundEnabled]);

  const onFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data);
    setCloseSignal(s => s + 1);
    playSound();
    const newUrl = `${window.location.pathname}?cat=${catalog.id}&page=${e.data + 1}`;
    window.history.replaceState({}, '', newUrl);
    // UX-09: Save reading progress
    localStorage.setItem(`nafas_progress_${catalog.id}`, String(e.data));
  }, [playSound, catalog.id]);

  // Analytics
  useEffect(() => {
    const statsStr = localStorage.getItem('nafas_analytics');
    const stats = statsStr ? JSON.parse(statsStr) : { viewsByCatalog: {}, timeByCatalogPage: {} };
    stats.viewsByCatalog[catalog.id] = (stats.viewsByCatalog[catalog.id] || 0) + 1;
    localStorage.setItem('nafas_analytics', JSON.stringify(stats));
  }, [catalog.id]);

  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (duration > 0) {
        const statsStr = localStorage.getItem('nafas_analytics');
        const stats = statsStr ? JSON.parse(statsStr) : { viewsByCatalog: {}, timeByCatalogPage: {} };
        if (!stats.timeByCatalogPage) stats.timeByCatalogPage = {};
        if (!stats.timeByCatalogPage[catalog.id]) stats.timeByCatalogPage[catalog.id] = {};
        const currentDur = stats.timeByCatalogPage[catalog.id][currentPage] || 0;
        stats.timeByCatalogPage[catalog.id][currentPage] = currentDur + duration;
        localStorage.setItem('nafas_analytics', JSON.stringify(stats));
      }
    };
  }, [currentPage, catalog.id]);

  const nextFlip = () => bookRef.current?.pageFlip().flipNext();
  const prevFlip = () => bookRef.current?.pageFlip().flipPrev();
  const goToPage = (index: number) => bookRef.current?.pageFlip().flip(index);
  const onInit = useCallback((e: { object: { pages: { length: number } } }) => setTotalPages(e.object.pages.length), []);

  // BUG-N07: Update virtual window position when current page changes
  useEffect(() => {
    const totalPages = usePdfMode ? (pdfDoc?.numPages ?? 0) : catalog.pages.length;
    const newStart = Math.max(0, currentPage - Math.floor(VIRTUAL_WINDOW_SIZE / 2));
    setVirtualStart(Math.min(newStart, Math.max(0, totalPages - VIRTUAL_WINDOW_SIZE)));
  }, [currentPage, usePdfMode, pdfDoc, catalog.pages.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(console.error);
    else document.exitFullscreen();
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, 4.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, 0.5));

  const handleDownload = () => {
    const link = document.createElement('a');
    if (catalog.pdfUrl) {
      link.href = catalog.pdfUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else if (catalog.pages[0]) {
      // Fix 1.2: open in new tab for cross-origin
      window.open(catalog.pages[0], '_blank', 'noopener,noreferrer');
    }
  };

  const handleExportNotes = () => {
    const allNotes: { page: number; type: string; content: string; color?: string }[] = [];
    Object.entries(annotations as Record<string, Annotation[]>).forEach(([pageIdx, anns]) => {
      anns.forEach(ann => {
        if (ann.type === 'note' && ann.content?.trim()) allNotes.push({ page: Number(pageIdx) + 1, type: 'یادداشت', content: ann.content });
        else if (ann.type === 'highlight') allNotes.push({ page: Number(pageIdx) + 1, type: 'هایلایت', content: '', color: ann.color });
      });
    });
    if (allNotes.length === 0) { toast('هیچ یادداشت یا هایلایتی برای خروجی وجود ندارد.', { icon: '📝' }); return; }
    
    // REMAINING-12: Generate HTML export
    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${catalog.title} - یادداشت‌ها</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
    .header h1 { font-size: 28px; margin-bottom: 10px; color: #2c3e50; }
    .header p { color: #7f8c8d; font-size: 14px; }
    .notes-list { display: grid; gap: 20px; }
    .note-item { border-right: 4px solid #3498db; padding: 15px; background: #f8f9fa; border-radius: 4px; page-break-inside: avoid; }
    .note-item.highlight { border-right-color: #f39c12; }
    .note-item.note { border-right-color: #9b59b6; }
    .note-item.yellow { border-right-color: #fde047; }
    .note-item.green { border-right-color: #86efac; }
    .note-item.blue { border-right-color: #93c5fd; }
    .note-item.pink { border-right-color: #f9a8d4; }
    .note-page { display: inline-block; background: #3498db; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; margin-left: 10px; }
    .note-type { font-weight: bold; color: #2c3e50; margin-bottom: 8px; }
    .note-content { color: #555; line-height: 1.8; }
    @media print {
      body { font-size: 12px; }
      .container { margin: 0; padding: 0; max-width: 100%; }
      .note-item { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${catalog.title}</h1>
      <p>صادرشده در: ${new Date().toLocaleDateString('fa-IR')}</p>
      <p>تعداد یادداشت‌ها: ${allNotes.length}</p>
    </div>
    <div class="notes-list">
      ${allNotes.map(note => {
        let colorClass = '';
        if (note.color === '#fde047') colorClass = 'yellow';
        else if (note.color === '#86efac') colorClass = 'green';
        else if (note.color === '#93c5fd') colorClass = 'blue';
        else if (note.color === '#f9a8d4') colorClass = 'pink';
        return `<div class="note-item ${note.type === 'هایلایت' ? 'highlight ' + colorClass : 'note'}">
        <div class="note-type">${note.type} <span class="note-page">صفحه ${note.page}</span></div>
        ${note.content ? `<div class="note-content">${note.content}</div>` : ''}
      </div>`;
      }).join('')}
    </div>
  </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${catalog.title.replace(/\s+/g, '_')}_notes.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${allNotes.length} یادداشت به HTML خروجی گرفته شد.`);
  };

  const handleSaveOffline = async () => {
    setIsCaching(true);
    try {
      const cache = await caches.open('assets-cache');
      if (usePdfMode && catalog.pdfUrl) await cache.add(catalog.pdfUrl).catch(() => {});
      else await Promise.allSettled(catalog.pages.map(p => cache.add(p)));
      toast.success('کاتالوگ برای استفاده آفلاین ذخیره شد.');
    } catch { toast.error('خطا در ذخیره‌سازی آفلاین.'); }
    setIsCaching(false);
  };

  // Gesture handlers
  const startGesture = (clientX: number, clientY: number, mode: 'swipe' | 'pan') => {
    if (activeTool !== 'cursor') return;
    setIsGesturing(true);
    gesture.current.startX = clientX; gesture.current.startY = clientY; gesture.current.mode = mode;
    if (mode === 'pan') { gesture.current.startPanX = pan.x; gesture.current.startPanY = pan.y; }
  };
  const moveGesture = (clientX: number, clientY: number) => {
    if (activeTool !== 'cursor') return;
    if (gesture.current.mode === 'pan') {
      const dx = clientX - gesture.current.startX;
      const dy = clientY - gesture.current.startY;
      setPan({ x: gesture.current.startPanX + dx, y: gesture.current.startPanY + dy });
    }
  };
  const endGesture = (clientX: number, clientY: number) => {
    if (activeTool !== 'cursor') return;
    setIsGesturing(false);
    if (gesture.current.mode === 'swipe') {
      const dx = clientX - gesture.current.startX;
      const dy = clientY - gesture.current.startY;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) prevFlip(); else nextFlip();
      }
    }
    gesture.current.mode = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTool !== 'cursor') return;
    if (e.touches.length === 2) {
      setIsGesturing(true); gesture.current.mode = 'pinch';
      gesture.current.startDist = getDistance(e.touches); gesture.current.startZoom = zoomLevel;
    } else if (e.touches.length === 1) {
      startGesture(e.touches[0]!.clientX, e.touches[0]!.clientY, zoomLevel > 1 ? 'pan' : 'swipe');
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeTool !== 'cursor') return;
    if (gesture.current.mode === 'pinch' && e.touches.length === 2) {
      const dist = getDistance(e.touches);
      setZoomLevel(Math.min(Math.max((dist / gesture.current.startDist) * gesture.current.startZoom, 0.5), 4));
    } else if (e.touches.length === 1) {
      moveGesture(e.touches[0]!.clientX, e.touches[0]!.clientY);
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeTool !== 'cursor') return;
    endGesture(e.changedTouches[0]!.clientX, e.changedTouches[0]!.clientY);
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || activeTool !== 'cursor') return;
    e.preventDefault();
    startGesture(e.clientX, e.clientY, zoomLevel > 1 ? 'pan' : 'swipe');
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool !== 'cursor') return;
    if (gesture.current.mode !== 'none') { e.preventDefault(); moveGesture(e.clientX, e.clientY); }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (activeTool !== 'cursor') return;
    if (gesture.current.mode !== 'none') endGesture(e.clientX, e.clientY);
  };

  // Reading progress (Fix 3.4)
  const totalPagesForProgress = totalPages || catalog.pages.length || 1;
  const readingProgress = Math.min(100, Math.round(((currentPage + 1) / totalPagesForProgress) * 100));

  const helpContent = (
    <div className="text-xs text-skin-text space-y-2">
      <div className="space-y-1">
        <p className="font-bold text-sm text-skin-primary">ورق زدن:</p>
        <p><kbd className="bg-skin-card px-1.5 py-0.5 rounded text-[10px] border border-skin-border">←</kbd> صفحه قبل</p>
        <p><kbd className="bg-skin-card px-1.5 py-0.5 rounded text-[10px] border border-skin-border">→</kbd> صفحه بعد</p>
      </div>
      <div className="space-y-1">
        <p className="font-bold text-sm text-skin-primary">حاشیه نویسی:</p>
        <p><strong>هایلایت:</strong> روی متن بکشید</p>
        <p><strong>یادداشت:</strong> روی قسمت کلیک کنید</p>
      </div>
      <div className="space-y-1">
        <p className="font-bold text-sm text-skin-primary">سایر:</p>
        <p><kbd className="bg-skin-card px-1.5 py-0.5 rounded text-[10px] border border-skin-border">?</kbd> نمایش راهنما</p>
        <p><kbd className="bg-skin-card px-1.5 py-0.5 rounded text-[10px] border border-skin-border">Esc</kbd> بستن</p>
      </div>
      <button onClick={() => setShowHelp(false)} className="w-full mt-2 bg-skin-control-bg hover:bg-skin-control-hover text-xs py-1.5 rounded-lg font-bold">متوجه شدم</button>
    </div>
  );

  // REMAINING-11: Calculate reading time estimate
  const SECS_PER_PAGE = 45;
  const totalPagesNum = totalPages || catalog.pages.length;
  const pagesLeft = Math.max(0, totalPagesNum - (currentPage + 1));
  const minutesLeft = Math.ceil((pagesLeft * SECS_PER_PAGE) / 60);

  return (
    <div
      ref={el => { containerRef.current = el; dialogRef.current = el; }}
      role="dialog"
      aria-modal="true"
      aria-label="نمایش کاتالوگ"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-skin-overlay backdrop-blur-md animate-fade-in touch-none select-none overflow-hidden"
    >
      {/* TOP PANEL */}
      <div className={`shrink-0 transition-all duration-300 ${showTopPanel ? 'opacity-100' : 'opacity-0 pointer-events-none -translate-y-full h-0'}`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-skin-card/80 backdrop-blur-md border-b border-skin-border">
          {/* TOC */}
          {hasToc && (
            <div className="relative">
              <button onClick={() => setShowToc(v => !v)} className={`p-2 rounded-lg border border-skin-border transition-colors ${showToc ? 'bg-skin-primary text-white' : 'bg-skin-control-bg text-skin-control-text hover:bg-skin-control-hover'}`}>
                <List size={16} />
              </button>
              {showToc && (
                <div className="absolute top-full right-0 mt-1 bg-skin-card border border-skin-border rounded-xl shadow-xl p-2 z-20 min-w-[180px]">
                  <p className="text-xs font-bold text-skin-muted px-2 py-1">فهرست مطالب</p>
                  {catalog.toc!.map((item, i) => (
                    <button key={i} onClick={() => { goToPage(item.page); setShowToc(false); }}
                      className="w-full flex items-center justify-between gap-2 text-right px-2 py-1.5 rounded-lg text-xs text-skin-text hover:bg-skin-control-bg transition-colors">
                      <span>{item.title}</span>
                      <span className="text-skin-muted">ص {item.page + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title + Page */}
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-bold text-skin-text truncate">{catalog.title}</p>
            <div className="flex flex-col gap-0.5 items-center">
              <p className="text-xs text-skin-muted">صفحه {currentPage + 1} از {totalPagesNum}</p>
              {/* REMAINING-11: Reading time estimate */}
              {pagesLeft > 0 && <p className="text-xs text-skin-muted">≈{minutesLeft} دقیقه مانده</p>}
              {pagesLeft === 0 && <p className="text-xs text-skin-primary font-semibold">پایان رسید! 🎉</p>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <div className="hidden md:flex items-center gap-1">
              <button onClick={() => setActiveTool('cursor')} className={`p-1.5 rounded transition-colors ${activeTool === 'cursor' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-control-text hover:bg-skin-control-hover'}`} title="جابجایی"><MousePointer2 size={14} /></button>
              <button onClick={() => setActiveTool('highlight')} className={`p-1.5 rounded transition-colors ${activeTool === 'highlight' ? 'bg-yellow-200 text-yellow-900' : 'text-skin-control-text hover:bg-skin-control-hover'}`} title="هایلایت"><Highlighter size={14} /></button>
              {/* REMAINING-09: Highlight color picker buttons */}
              {activeTool === 'highlight' && (
                <div className="hidden md:flex items-center gap-1">
                  {HIGHLIGHT_COLORS.map(color => (
                    <button
                      key={color.hex}
                      onClick={() => setHighlightColor(color.hex)}
                      className={`w-6 h-6 rounded transition-all border-2 ${highlightColor === color.hex ? 'border-black shadow-md' : 'border-gray-300 hover:border-gray-400'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      aria-label={color.name}
                    />
                  ))}
                </div>
              )}
              <button onClick={() => setActiveTool('note')} className={`p-1.5 rounded transition-colors ${activeTool === 'note' ? 'bg-yellow-200 text-yellow-900' : 'text-skin-control-text hover:bg-skin-control-hover'}`} title="یادداشت"><StickyNote size={14} /></button>
              <div className="relative">
                <button onClick={() => setShowHelp(!showHelp)} className={`p-1.5 rounded transition-colors ${showHelp ? 'bg-blue-100 text-blue-700' : 'text-skin-control-text hover:bg-skin-control-hover'}`} title="راهنما"><Info size={14} /></button>
              </div>
              <div className="w-px h-4 bg-skin-border mx-1" />
              <button onClick={() => setForceSinglePage(!forceSinglePage)} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title={forceSinglePage ? 'دو صفحه' : 'تک صفحه'}>{forceSinglePage ? <Book size={14} /> : <Smartphone size={14} />}</button>
              <span className="text-[10px] text-skin-muted font-mono">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors">{isSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
              <button onClick={toggleFullscreen} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors">{isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}</button>
              <button onClick={isCaching ? undefined : handleSaveOffline} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title="ذخیره آفلاین">{isCaching ? <PackageOpen size={14} className="animate-pulse" /> : <DownloadCloud size={14} />}</button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('لینک صفحه کپی شد!'); }} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors"><Share2 size={14} /></button>
            </div>
            <button onClick={() => setShowTopPanel(false)} className="p-1 rounded-full bg-skin-control-bg hover:bg-skin-control-hover text-skin-muted transition-colors"><ChevronUp size={14} /></button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-skin-primary/10 hover:bg-skin-primary/20 text-skin-primary transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Fix 3.4: Reading progress bar */}
        <div className="h-[3px] bg-skin-border">
          <div
            className="h-full bg-skin-primary transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </div>

      {/* Floating expand (top panel) */}
      {!showTopPanel && (
        <button
          onClick={() => setShowTopPanel(true)}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-skin-card/80 backdrop-blur-sm border border-skin-border rounded-full p-2 shadow-lg text-skin-muted hover:text-skin-primary transition-all"
        >
          <ChevronDown size={14} />
        </button>
      )}

      {/* Book container */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ cursor: isGesturing ? 'grabbing' : activeTool === 'cursor' ? 'grab' : 'crosshair' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Nav arrows */}
        <button onClick={(e) => { e.stopPropagation(); nextFlip(); }} className="hidden md:flex absolute right-6 z-10 p-3 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-full shadow-lg hover:scale-110 transition-all">
          <ChevronRight size={20} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); prevFlip(); }} className="hidden md:flex absolute left-6 z-10 p-3 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-full shadow-lg hover:scale-110 transition-all">
          <ChevronLeft size={20} />
        </button>

        {/* Zoom/pan visual cues */}
        {zoomLevel <= 1 && currentPage < (totalPages || catalog.pages.length) - 1 && activeTool === 'cursor' && (
          <div className="hidden md:flex absolute right-20 top-1/2 -translate-y-1/2 flex-col gap-2 z-10 opacity-30 pointer-events-none">
            <ChevronRight size={40} className="text-white" />
          </div>
        )}

        {isLoadingPdf && (
          <div className="flex flex-col items-center justify-center gap-3 text-skin-muted">
            <div className="w-12 h-12 border-4 border-skin-border border-t-skin-primary rounded-full animate-spin" />
            <p className="text-sm">در حال بارگذاری PDF...</p>
          </div>
        )}
        {pdfError && <div className="text-red-500 text-sm">{pdfError}</div>}

        {!isLoadingPdf && !pdfError && (
          <div style={{ transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`, transition: isGesturing ? 'none' : 'transform 0.1s' }}>
            {/* @ts-ignore */}
            <HTMLFlipBook
              ref={bookRef}
              width={dimensions.width}
              height={dimensions.height}
              size="fixed"
              minWidth={100}
              maxWidth={2000}
              minHeight={150}
              maxHeight={3000}
              drawShadow={true}
              flippingTime={600}
              usePortrait={isMobile || forceSinglePage}
              startPage={0}
              showCover={false}
              mobileScrollSupport={false}
              clickEventForward={true}
              useMouseEvents={activeTool === 'cursor'}
              swipeDistance={0}
              showPageCorners={activeTool === 'cursor'}
              onInit={onInit}
              onFlip={onFlip}
              className="shadow-2xl"
            >
              {usePdfMode && pdfDoc
                ? Array.from(new Array(pdfDoc.numPages), (_, index) => (
                    <PdfPage
                      key={index}
                      doc={pdfDoc}
                      pageNumber={index + 1}
                      onRendered={(dataUrl) => setPdfThumbnails(prev => ({ ...prev, [index]: dataUrl }))}
                    >
                      <AnnotationLayer
                        pageIndex={index}
                        isActivePage={currentPage === index}
                        activeTool={activeTool}
                        annotations={annotations[index] || []}
                        closeSignal={closeSignal}
                        layoutKey={layoutKey}
                        highlightColor={highlightColor}
                        onAdd={(ann) => handleAddAnnotation(index, ann)}
                        onUpdate={(id, content) => handleUpdateAnnotation(index, id, content)}
                        onDelete={(id) => handleDeleteAnnotation(index, id)}
                      />
                    </PdfPage>
                  ))
                : catalog.pages.map((pageUrl, index) => (
                    <Page key={index} number={index + 1}>
                      <SafeImage
                        src={pageUrl}
                        alt={`صفحه ${index + 1}`}
                        className="w-full h-full object-cover select-none"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        loading="lazy"
                        decoding="async"
                      />
                      <AnnotationLayer
                        pageIndex={index}
                        isActivePage={currentPage === index}
                        activeTool={activeTool}
                        annotations={annotations[index] || []}
                        closeSignal={closeSignal}
                        layoutKey={layoutKey}
                        highlightColor={highlightColor}
                        onAdd={(ann) => handleAddAnnotation(index, ann)}
                        onUpdate={(id, content) => handleUpdateAnnotation(index, id, content)}
                        onDelete={(id) => handleDeleteAnnotation(index, id)}
                      />
                    </Page>
                  ))
              }
            </HTMLFlipBook>
          </div>
        )}
      </div>

      {/* BOTTOM PANEL */}
      <div className={`shrink-0 transition-all duration-300 ${showBottomPanel ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-full h-0'}`}>
        <div className="bg-skin-card/80 backdrop-blur-md border-t border-skin-border">
          {/* Mobile toolbar */}
          <div className="flex md:hidden items-center justify-between gap-1 px-3 py-1.5 border-b border-skin-border">
            <div className="flex items-center gap-1">
              <button onClick={() => setActiveTool('cursor')} className={`p-2 rounded ${activeTool === 'cursor' ? 'bg-skin-control-hover text-skin-primary' : 'text-skin-muted'}`}><MousePointer2 size={14} /></button>
              <button onClick={() => setActiveTool('highlight')} className={`p-2 rounded ${activeTool === 'highlight' ? 'bg-yellow-100 text-yellow-800' : 'text-skin-muted'}`}><Highlighter size={14} /></button>
              {/* REMAINING-09: Mobile highlight color picker */}
              {activeTool === 'highlight' && (
                <div className="flex items-center gap-1">
                  {HIGHLIGHT_COLORS.map(color => (
                    <button
                      key={color.hex}
                      onClick={() => setHighlightColor(color.hex)}
                      className={`w-5 h-5 rounded transition-all border-2 ${highlightColor === color.hex ? 'border-black shadow-md' : 'border-gray-300'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      aria-label={color.name}
                    />
                  ))}
                </div>
              )}
              <button onClick={() => setActiveTool('note')} className={`p-2 rounded ${activeTool === 'note' ? 'bg-yellow-100 text-yellow-800' : 'text-skin-muted'}`}><StickyNote size={14} /></button>
              <button onClick={() => setShowHelp(!showHelp)} className={`p-2 rounded ${showHelp ? 'bg-blue-100 text-blue-700' : 'text-skin-muted'}`}><Info size={14} /></button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleZoomOut} className="p-2 text-skin-muted hover:text-skin-primary rounded"><ZoomOut size={14} /></button>
              <button onClick={handleZoomIn} className="p-2 text-skin-muted hover:text-skin-primary rounded"><ZoomIn size={14} /></button>
              <button onClick={handleDownload} className="p-2 text-skin-muted hover:text-skin-primary rounded"><FileDown size={14} /></button>
              <button onClick={handleExportNotes} className="p-2 text-skin-muted hover:text-skin-primary rounded"><StickyNote size={14} /></button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('لینک صفحه کپی شد!'); }} className="p-2 text-skin-muted hover:text-skin-primary rounded"><Share2 size={14} /></button>
            </div>
            <button onClick={() => setShowBottomPanel(false)} className="p-1 rounded-full bg-skin-control-bg text-skin-muted"><ChevronDown size={14} /></button>
          </div>

          {/* Thumbnail strip */}
          <div ref={thumbStripRef} className="flex gap-2 overflow-x-auto scrollbar-hide p-2">
            {usePdfMode && pdfDoc
              ? (() => {
                  const visibleIndices = Array.from({ length: Math.min(VIRTUAL_WINDOW_SIZE, pdfDoc.numPages) }, (_, i) => virtualStart + i);
                  return visibleIndices.map(idx => (
                    <button
                      key={idx}
                      data-thumb={idx}
                      onClick={() => goToPage(idx)}
                      className={`shrink-0 h-16 w-12 rounded border-2 overflow-hidden flex items-center justify-center bg-white transition-all ${currentPage === idx ? 'border-skin-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      {pdfThumbnails[idx] ? <img src={pdfThumbnails[idx]} alt={`${idx + 1}`} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">{idx + 1}</span>}
                    </button>
                  ));
                })()
              : (() => {
                  const visibleIndices = Array.from({ length: Math.min(VIRTUAL_WINDOW_SIZE, catalog.pages.length) }, (_, i) => virtualStart + i);
                  return visibleIndices.map(idx => (
                    <button
                      key={idx}
                      data-thumb={idx}
                      onClick={() => goToPage(idx)}
                      className={`shrink-0 h-16 w-12 rounded border-2 overflow-hidden transition-all ${currentPage === idx ? 'border-skin-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <SafeImage src={catalog.pages[idx]} alt={`ص ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </button>
                  ));
                })()
            }
          </div>
        </div>
      </div>

      {/* Floating bottom expand */}
      {!showBottomPanel && (
        <button
          onClick={() => setShowBottomPanel(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-skin-card/80 backdrop-blur-sm border border-skin-border rounded-full p-2 shadow-lg text-skin-muted hover:text-skin-primary transition-all"
        >
          <ChevronUp size={14} />
        </button>
      )}

      {/* MISSING-05: Full keyboard shortcuts modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-skin-card border border-skin-border rounded-2xl p-6 w-96 shadow-2xl max-h-96 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-skin-text flex items-center gap-2">
                  <kbd className="bg-skin-control-bg px-2 py-1 rounded text-xs border border-skin-border">?</kbd>
                  میانبرهای صفحه‌کلید
                </h3>
                <button onClick={() => setShowHelp(false)} className="p-1 text-skin-muted hover:text-skin-text">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ['←', 'صفحه قبل'],
                  ['→', 'صفحه بعد'],
                  ['Home', 'صفحه اول'],
                  ['End', 'صفحه آخر'],
                  ['H', 'ابزار هایلایت'],
                  ['N', 'ابزار یادداشت'],
                  ['C', 'ابزار مکان‌نما'],
                  ['F', 'تمام‌صفحه'],
                  ['S', 'ذخیره آفلاین'],
                  ['+', 'بزرگ‌نمایی'],
                  ['-', 'کوچک‌نمایی'],
                  ['?', 'این پنل'],
                  ['Esc', 'بستن'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-skin-muted">{label}</span>
                    <kbd className="bg-skin-control-bg px-2 py-0.5 rounded text-xs font-mono border border-skin-border">{key}</kbd>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-4 bg-skin-primary text-white py-2 rounded-xl text-sm font-bold hover:bg-skin-primary-hover transition-colors"
              >
                بستن
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {(() => {
        const relatedCatalogs = allCatalogs
          .filter(c => c.category === catalog.category && c.id !== catalog.id)
          .slice(0, 4);
        
        return relatedCatalogs.length > 0 ? (
          <div className="px-4 py-3 border-t border-skin-border bg-skin-card/80">
            <p className="text-xs text-skin-muted mb-2 font-medium">ممکن است برایتان مفید باشد</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {relatedCatalogs.map(rc => (
                <button
                  key={rc.id}
                  onClick={() => {
                    onClose();
                    setTimeout(() => onOpenCatalog?.(rc), 100);
                  }}
                  className="shrink-0 flex items-center gap-2 bg-skin-control-bg hover:bg-skin-control-hover rounded-xl px-3 py-2 text-xs text-skin-text transition-colors border border-skin-border hover:border-skin-primary/30"
                >
                  <img src={rc.coverImage} alt="" className="w-8 h-10 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2740%27 viewBox=%270 0 32 40%27%3E%3Crect width=%2732%27 height=%2740%27 fill=%27%23f1f5f9%27/%3E%3C/svg%3E'; }} />
                  <span className="max-w-[80px] text-right leading-tight line-clamp-2">{rc.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
};

export default BookViewer;
