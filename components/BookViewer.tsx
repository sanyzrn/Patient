import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { toast } from 'react-hot-toast';
import { Catalog } from '../types';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX,
  FileDown,
  DownloadCloud,
  ZoomIn,
  ZoomOut,
  Book,
  Smartphone,
  ChevronUp,
  ChevronDown,
  Highlighter,
  StickyNote,
  MousePointer2,
  Trash2,
  Check,
  MessageSquare,
  Info,
  Share2,
  List,
  PackageOpen
} from 'lucide-react';

interface BookViewerProps {
  catalog: Catalog;
  onClose: () => void;
  initialPage?: number;
}

// Annotation Types
interface Annotation {
  id: string;
  type: 'highlight' | 'note';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width?: number; // Percentage for highlight
  height?: number; // Percentage for highlight
  content?: string; // For notes
  color?: string;
  isOpen?: boolean; // For notes UI state
}

// Sound effect URL
const PAGE_FLIP_SOUND_URL = "https://nafaspharmed.com/mp3/paper.mp3";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Helper for distance between two touch points
const getDistance = (touches: React.TouchList) => {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
};

// --- Note Item Component (popup in portal to avoid clip/jump) ---
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
    const [popupRect, setPopupRect] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

    useEffect(() => {
        setContent(ann.content ?? '');
    }, [ann.content]);

    useEffect(() => {
        if (!isActive || !buttonRef.current) {
            setPopupRect(null);
            return;
        }
        const el = buttonRef.current;
        const rect = el.getBoundingClientRect();
        const popupHeight = 160;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < popupHeight && rect.top > spaceBelow;
        setPopupRect({
            left: rect.left + rect.width / 2,
            top: openUp ? rect.top : rect.bottom,
            openUp,
        });
    }, [isActive, layoutKey]);

    const handleSave = useCallback(() => {
        if (content !== (ann.content ?? '')) {
            onUpdate(ann.id, content);
        }
    }, [content, ann.content, ann.id, onUpdate]);

    const handleClose = useCallback(() => {
        handleSave();
        onToggleActive();
    }, [handleSave, onToggleActive]);

    useEffect(() => {
        if (!isActive) return;
        const onResize = () => {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const popupHeight = 160;
                const spaceBelow = window.innerHeight - rect.bottom;
                const openUp = spaceBelow < popupHeight && rect.top > spaceBelow;
                setPopupRect({
                    left: rect.left + rect.width / 2,
                    top: openUp ? rect.top : rect.bottom,
                    openUp,
                });
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isActive]);

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

    const popupContent = isActive && popupRect && (
        <div
            data-note-popup
            role="dialog"
            aria-label="یادداشت"
            className="fixed z-[9999] w-56 sm:w-72 bg-yellow-100 border border-yellow-300 rounded-xl shadow-2xl p-3 text-right cursor-default animate-fade-in"
            style={{
                left: popupRect.left,
                top: popupRect.openUp ? undefined : popupRect.top + 6,
                bottom: popupRect.openUp ? window.innerHeight - popupRect.top + 6 : undefined,
                transform: 'translateX(-50%)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <textarea
                className="w-full bg-white/60 border border-yellow-200 rounded-lg p-2 resize-none outline-none text-sm text-gray-800 min-h-[88px] mb-3 placeholder-yellow-800/50 focus:ring-2 focus:ring-yellow-400"
                placeholder="یادداشت خود را بنویسید..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleSave}
                autoFocus
            />
            <div className="flex justify-between items-center gap-2">
                <button
                    type="button"
                    onClick={() => { onDelete(ann.id); onToggleActive(); }}
                    className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
                    title="حذف یادداشت"
                >
                    <Trash2 size={18} />
                </button>
                <button
                    type="button"
                    onClick={handleClose}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors flex items-center gap-1"
                >
                    <Check size={16} />
                    ذخیره و بستن
                </button>
            </div>
            <div
                className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent ${popupRect.openUp ? 'border-t-[8px] border-t-yellow-100 top-full' : 'border-b-[8px] border-b-yellow-100 bottom-full'}`}
            />
        </div>
    );

    return (
        <div className="relative -translate-x-1/2 -translate-y-1/2">
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
                className={`p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95 ${isActive ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-500' : 'bg-yellow-200 text-yellow-700'}`}
                title="یادداشت"
            >
                <MessageSquare size={20} fill={isActive ? 'currentColor' : 'none'} />
            </button>
            {typeof document !== 'undefined' && popupContent && ReactDOM.createPortal(popupContent, document.body)}
        </div>
    );
};

// --- Annotation Layer Component ---
interface AnnotationLayerProps {
    pageIndex: number;
    isActivePage: boolean;
    activeTool: 'cursor' | 'highlight' | 'note';
    annotations: Annotation[];
    closeSignal: number;
    layoutKey: number;
    onAdd: (ann: Annotation) => void;
    onUpdate: (id: string, content: string) => void;
    onDelete: (id: string) => void;
}

const getRelativeCoordsFromClient = (rect: DOMRect, clientX: number, clientY: number) => ({
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100
});

const TAP_MAX_MOVE = 10;
const TAP_MAX_MS = 300;

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({ pageIndex, isActivePage, activeTool, annotations, closeSignal, layoutKey, onAdd, onUpdate, onDelete }) => {
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
        const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return getRelativeCoordsFromClient(rect, clientX, clientY);
    }, []);

    const getEndCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        let clientX: number, clientY: number;
        if ('changedTouches' in e && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            const me = e as React.MouseEvent;
            clientX = me.clientX;
            clientY = me.clientY;
        }
        return getRelativeCoordsFromClient(rect, clientX, clientY);
    }, []);

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool === 'cursor') return;
        if ('touches' in e && e.cancelable) e.preventDefault();
        e.stopPropagation();
        addedNoteByTouchRef.current = false;

        if (activeTool === 'note' && activeNoteId) {
            const target = e.target as HTMLElement;
            if (!target.closest('.annotation-item')) {
                setActiveNoteId(null);
                suppressNextCreateRef.current = true;
                return;
            }
        }

        if (activeTool === 'highlight') {
            setIsDrawing(true);
            const coords = getRelativeCoords(e);
            setStartPoint(coords);
            setCurrentPoint(coords);
        } else if (activeTool === 'note' && 'touches' in e && e.touches.length === 1) {
            const coords = getRelativeCoords(e);
            touchStartRef.current = { x: coords.x, y: coords.y, t: Date.now() };
        }
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'cursor') {
            e.stopPropagation();
        }
        if (!isDrawing) return;
        if ('touches' in e && e.cancelable) e.preventDefault();
        setCurrentPoint(getRelativeCoords(e));
    };

    const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'cursor') {
             e.stopPropagation();
        }
        
        if (isDrawing) {
            if ('changedTouches' in e && e.cancelable) e.preventDefault();
            setIsDrawing(false);
            const endPoint = getEndCoords(e);
            const x = Math.min(startPoint.x, endPoint.x);
            const y = Math.min(startPoint.y, endPoint.y);
            const width = Math.abs(endPoint.x - startPoint.x);
            const height = Math.abs(endPoint.y - startPoint.y);
            const rect = containerRef.current?.getBoundingClientRect();
            const widthPx = rect ? (width / 100) * rect.width : 0;
            const heightPx = rect ? (height / 100) * rect.height : 0;
            if (widthPx >= 8 && heightPx >= 8) {
                onAdd({
                    id: Date.now().toString(),
                    type: 'highlight',
                    x, y, width, height,
                    color: '#fde047'
                });
            }
            return;
        }

        if (activeTool === 'note' && 'changedTouches' in e && e.changedTouches.length > 0) {
            const start = touchStartRef.current;
            touchStartRef.current = null;
            if (start && (Date.now() - start.t) < TAP_MAX_MS) {
                const endPoint = getEndCoords(e);
                if (Math.hypot(endPoint.x - start.x, endPoint.y - start.y) < TAP_MAX_MOVE) {
                    e.preventDefault();
                    e.stopPropagation();
                    if ((e.target as HTMLElement).closest('.annotation-item')) return;
                    const newId = Date.now().toString();
                    onAdd({
                        id: newId,
                        type: 'note',
                        x: endPoint.x,
                        y: endPoint.y,
                        content: '',
                        color: '#fef08a'
                    });
                    setActiveNoteId(newId);
                    addedNoteByTouchRef.current = true;
                }
            }
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (activeTool === 'note') {
            e.stopPropagation();
            if (addedNoteByTouchRef.current) {
                addedNoteByTouchRef.current = false;
                return;
            }
            if (suppressNextCreateRef.current) {
                suppressNextCreateRef.current = false;
                return;
            }
            if (activeNoteId) {
                setActiveNoteId(null);
                suppressNextCreateRef.current = true;
                return;
            }
            if ((e.target as HTMLElement).closest('.annotation-item')) return;
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            const newId = Date.now().toString();
            onAdd({
                id: newId,
                type: 'note',
                x, y,
                content: '',
                color: '#fef08a'
            });
            setActiveNoteId(newId);
        }
    };

    useEffect(() => {
        if (activeTool !== 'note') {
            setActiveNoteId(null);
        }
    }, [activeTool]);

    useEffect(() => {
        if (!isActivePage) {
            setActiveNoteId(null);
            setIsDrawing(false);
        }
    }, [isActivePage]);

    useEffect(() => {
        setActiveNoteId(null);
        setIsDrawing(false);
    }, [closeSignal]);

    return (
        <div 
            ref={containerRef}
            className={`absolute inset-0 z-10 ${activeTool !== 'cursor' ? 'cursor-crosshair touch-none' : 'pointer-events-none'}`}
            style={{ contain: 'layout style', touchAction: activeTool !== 'cursor' ? 'none' : 'auto' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onClick={handleClick}
        >
            {/* Existing Annotations */}
            {annotations.map(ann => (
                <div 
                    key={ann.id}
                    className="annotation-item absolute pointer-events-auto group"
                    style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: ann.type === 'highlight' ? `${ann.width}%` : 'auto',
                        height: ann.type === 'highlight' ? `${ann.height}%` : 'auto',
                    }}
                    onClick={(e) => {
                        if (activeTool === 'cursor' || activeTool === 'highlight') {
                            e.stopPropagation();
                            if (ann.type === 'note') setActiveNoteId(activeNoteId === ann.id ? null : ann.id);
                        }
                    }}
                >
                    {ann.type === 'highlight' && (
                        <div className="w-full h-full bg-yellow-300/40 mix-blend-multiply border border-yellow-400/50 hover:bg-yellow-300/60 transition-colors relative">
                             {/* Delete Highlight Button */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity transform scale-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            >
                                <X size={12} />
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

            {/* Drawing Preview */}
            {isDrawing && (
                <div 
                    className="absolute bg-yellow-300/40 border border-yellow-400 border-dashed pointer-events-none"
                    style={{
                        left: `${Math.min(startPoint.x, currentPoint.x)}%`,
                        top: `${Math.min(startPoint.y, currentPoint.y)}%`,
                        width: `${Math.abs(currentPoint.x - startPoint.x)}%`,
                        height: `${Math.abs(currentPoint.y - startPoint.y)}%`,
                    }}
                />
            )}
        </div>
    );
};

// ForwardRef for Page
const Page = React.forwardRef<HTMLDivElement, { children: React.ReactNode, number: number }>((props, ref) => {
  return (
    <div className="bg-white shadow-inner h-full w-full" ref={ref}>
        <div className="h-full w-full relative overflow-hidden select-none">
            {props.children}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400 text-xs font-medium bg-white/80 px-2 py-1 rounded-md shadow-sm pointer-events-none z-10">
                {props.number}
            </div>
        </div>
    </div>
  );
});
Page.displayName = 'Page';

const PdfPage = React.forwardRef<HTMLDivElement, { doc: pdfjsLib.PDFDocumentProxy, pageNumber: number, onRendered?: (dataUrl: string) => void, children?: React.ReactNode }>((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendered, setRendered] = useState(false);

    useEffect(() => {
        let renderTask: any;
        let isSetup = true;

        const renderPage = async () => {
            if (!props.doc) return;
            try {
                const page = await props.doc.getPage(props.pageNumber);
                // 1.5 scale is a good balance between quality and performance
                const viewport = page.getViewport({ scale: 1.5 }); 
                
                const canvas = canvasRef.current;
                if (!canvas || !isSetup) return;
                
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                renderTask = page.render({ canvasContext: context!, canvas, viewport });
                await renderTask.promise;
                
                if (isSetup) {
                    setRendered(true);
                    if (props.onRendered) {
                        props.onRendered(canvas.toDataURL('image/jpeg', 0.8));
                    }
                }
            } catch (err: any) {
                if (err?.name !== 'RenderingCancelledException') {
                    console.error('Error rendering PDF page:', err);
                }
            }
        };

        renderPage();

        return () => {
            isSetup = false;
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [props.doc, props.pageNumber]);

    return (
        <div className="bg-white shadow-inner h-full w-full" ref={ref}>
            <div className="h-full w-full relative overflow-hidden flex items-center justify-center select-none bg-white">
                <canvas 
                    ref={canvasRef} 
                    className="max-w-full max-h-full object-contain pointer-events-none absolute" 
                    style={{ opacity: rendered ? 1 : 0, transition: 'opacity 0.3s' }}
                />
                {!rendered && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-skin-muted text-sm animate-pulse">در حال تبدیل صفحه...</span>
                    </div>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400 text-xs font-medium bg-white/80 px-2 py-1 rounded-md shadow-sm pointer-events-none z-10">
                    {props.pageNumber}
                </div>
                {props.children}
            </div>
        </div>
    );
});
PdfPage.displayName = 'PdfPage';

const BookViewer: React.FC<BookViewerProps> = ({ catalog, onClose, initialPage = 0 }) => {
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const usePdfMode = !!catalog.pdfUrl && catalog.pages.length === 0;

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
  
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(usePdfMode);
  const [pdfError, setPdfError] = useState('');
  const [pdfThumbnails, setPdfThumbnails] = useState<Record<number, string>>({});
  
  // Settings
  const [isMobile, setIsMobile] = useState(false);
  const [forceSinglePage, setForceSinglePage] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [isCaching, setIsCaching] = useState(false);

  const hasToc = Array.isArray(catalog.toc) && catalog.toc.length > 0;

  // UI Settings
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // Independent Panel States
  const [showTopPanel, setShowTopPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);

  // Gesture State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [closeSignal, setCloseSignal] = useState(0);
  const [layoutKey, setLayoutKey] = useState(0);

  // Annotation State
  const [activeTool, setActiveTool] = useState<'cursor' | 'highlight' | 'note'>('cursor');
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});

  // Gesture Refs
  const gesture = useRef({
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startDist: 0,
    startZoom: 1,
    mode: 'none' as 'none' | 'swipe' | 'pan' | 'pinch',
  });
  
  // Load PDF if in PdfMode
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
    if (saved) {
        try {
            setAnnotations(JSON.parse(saved));
        } catch (e) { console.error('Error loading annotations', e); }
    }
  }, [catalog.id]);

  // Save Annotations
  useEffect(() => {
    if (Object.keys(annotations).length > 0) {
        localStorage.setItem(`nafas_annotations_${catalog.id}`, JSON.stringify(annotations));
    } else {
        localStorage.removeItem(`nafas_annotations_${catalog.id}`);
    }
  }, [annotations, catalog.id]);

  const getFocusable = useCallback((root: HTMLElement) => {
    const items = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(items).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  }, []);

  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = getFocusable(root);
    (focusables[0] || root).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable(root);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      lastFocusedRef.current?.focus?.();
    };
  }, [getFocusable, onClose]);

  const handleAddAnnotation = (pageIndex: number, ann: Annotation) => {
    setAnnotations(prev => ({
        ...prev,
        [pageIndex]: [...(prev[pageIndex] || []), ann]
    }));
    // Switch back to cursor after adding note? No, let user add multiple.
    if (ann.type === 'highlight') setActiveTool('cursor'); 
  };

  const handleUpdateAnnotation = (pageIndex: number, id: string, content: string) => {
      setAnnotations(prev => ({
          ...prev,
          [pageIndex]: prev[pageIndex]?.map(a => a.id === id ? { ...a, content } : a) || []
      }));
  };

  const handleDeleteAnnotation = (pageIndex: number, id: string) => {
      setAnnotations(prev => {
          const pageAnns = (prev[pageIndex] || []).filter(a => a.id !== id);
          const next = { ...prev, [pageIndex]: pageAnns };
          if (pageAnns.length === 0) {
              delete next[pageIndex];
          }
          return next;
      });
  };

  useEffect(() => {
      setLayoutKey(k => k + 1);
  }, [zoomLevel, pan.x, pan.y, currentPage]);

  // Keep the active thumbnail visible in the strip.
  useEffect(() => {
      const strip = thumbStripRef.current;
      if (!strip) return;
      const active = strip.querySelector<HTMLElement>(`[data-thumb="${currentPage}"]`);
      if (active) {
          active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
  }, [currentPage]);

  // Keyboard navigation: arrow keys flip pages (RTL-aware).
  useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
          const tag = (e.target as HTMLElement)?.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (e.key === 'ArrowLeft') { e.preventDefault(); bookRef.current?.pageFlip()?.flipNext(); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); bookRef.current?.pageFlip()?.flipPrev(); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initialize Audio & Jump to Page
  useEffect(() => {
    audioRef.current = new Audio(PAGE_FLIP_SOUND_URL);
    audioRef.current.volume = 0.4;
    
    // Slight delay to allow book to init
    if (initialPage > 0) {
        setTimeout(() => {
             bookRef.current?.pageFlip().flip(initialPage);
        }, 500);
    }
  }, [initialPage]);

  // Responsive Resizing & Mode
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const isSmallScreen = windowWidth < 768;
      setIsMobile(isSmallScreen);
      if (isSmallScreen) setForceSinglePage(true);

      const verticalPadding = isSmallScreen ? 140 : 120;
      const horizontalPadding = isSmallScreen ? 0 : 100;

      const availableHeight = windowHeight - verticalPadding;
      const availableWidth = windowWidth - horizontalPadding;

      const aspectRatio = 1.414;
      let bookHeight = availableHeight;
      let bookWidth = bookHeight / aspectRatio;

      if (bookWidth > availableWidth) {
        bookWidth = availableWidth;
        bookHeight = bookWidth * aspectRatio;
      }

      setDimensions({ 
          width: Math.floor(bookWidth), 
          height: Math.floor(bookHeight) 
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fullscreen Handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Reset Pan when Zoom is <= 1
  useEffect(() => {
    if (zoomLevel <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  const playSound = useCallback(() => {
    if (isSoundEnabled && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    }
  }, [isSoundEnabled]);

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
    setCloseSignal(s => s + 1);
    playSound();
    
    // Update Deep Link
    const newUrl = `${window.location.pathname}?cat=${catalog.id}&page=${e.data + 1}`;
    window.history.replaceState({}, '', newUrl);
  }, [playSound, catalog.id]);

  // --- Analytics Tracking ---
  useEffect(() => {
    // Initial Catalog View
    const statsStr = localStorage.getItem('nafas_analytics');
    let stats = statsStr ? JSON.parse(statsStr) : { viewsByCatalog: {}, timeByCatalogPage: {} };
    stats.viewsByCatalog[catalog.id] = (stats.viewsByCatalog[catalog.id] || 0) + 1;
    localStorage.setItem('nafas_analytics', JSON.stringify(stats));
  }, [catalog.id]);

  useEffect(() => {
      // Time tracking per page
      const startTime = Date.now();
      return () => {
          const duration = Math.floor((Date.now() - startTime) / 1000); // seconds
          if (duration > 0) {
              const statsStr = localStorage.getItem('nafas_analytics');
              let stats = statsStr ? JSON.parse(statsStr) : { viewsByCatalog: {}, timeByCatalogPage: {} };
              
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
  
  const onInit = useCallback((e: any) => setTotalPages(e.object.pages.length), []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => {
      const next = Math.round((prev + 0.1) * 10) / 10;
      return Math.min(next, 4.0);
  });
  
  const handleZoomOut = () => setZoomLevel(prev => {
      const next = Math.round((prev - 0.1) * 10) / 10;
      return Math.max(next, 0.5);
  });

  const handleDownload = () => {
    const link = document.createElement('a');
    if (catalog.pdfUrl) {
      link.href = catalog.pdfUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.href = catalog.pages[0];
      link.download = `${catalog.title.replace(/\s+/g, '_')}_preview.jpg`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportNotes = () => {
    const allNotes: { page: number; type: string; content: string }[] = [];
    Object.entries(annotations as Record<string, Annotation[]>).forEach(([pageIdx, anns]) => {
      anns.forEach(ann => {
        if (ann.type === 'note' && ann.content?.trim()) {
          allNotes.push({ page: Number(pageIdx) + 1, type: 'یادداشت', content: ann.content });
        } else if (ann.type === 'highlight') {
          allNotes.push({ page: Number(pageIdx) + 1, type: 'هایلایت', content: '' });
        }
      });
    });
    if (allNotes.length === 0) {
      toast('هیچ یادداشت یا هایلایتی برای خروجی وجود ندارد.', { icon: '📝' });
      return;
    }
    const payload = { catalog: catalog.title, exportedAt: new Date().toISOString(), notes: allNotes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${catalog.title.replace(/\s+/g, '_')}_notes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${allNotes.length} یادداشت خروجی گرفته شد.`);
  };

  const handleSaveOffline = async () => {
    setIsCaching(true);
    try {
      const cache = await caches.open('assets-cache');
      if (usePdfMode && catalog.pdfUrl) {
          await cache.add(catalog.pdfUrl).catch(() => {});
      } else {
          await Promise.allSettled(catalog.pages.map(p => cache.add(p)));
      }
      toast.success('کاتالوگ برای استفاده آفلاین در دستگاه شما ذخیره شد.');
    } catch (err) {
      console.error('Error caching', err);
      toast.error('خطا در ذخیره‌سازی آفلاین.');
    }
    setIsCaching(false);
  };

  // --- GESTURE LOGIC (TOUCH & MOUSE) ---
  const startGesture = (clientX: number, clientY: number, mode: 'swipe' | 'pan') => {
    // Disable gestures if a tool is active
    if (activeTool !== 'cursor') return;
    
    setIsGesturing(true);
    gesture.current.startX = clientX;
    gesture.current.startY = clientY;
    gesture.current.mode = mode;

    if (mode === 'pan') {
      gesture.current.startPanX = pan.x;
      gesture.current.startPanY = pan.y;
    }
  };

  const moveGesture = (clientX: number, clientY: number) => {
    if (activeTool !== 'cursor') return;

    if (gesture.current.mode === 'pan') {
      const dx = clientX - gesture.current.startX;
      const dy = clientY - gesture.current.startY;
      setPan({ 
        x: gesture.current.startPanX + dx, 
        y: gesture.current.startPanY + dy 
      });
    }
  };

  const endGesture = (clientX: number, clientY: number) => {
    if (activeTool !== 'cursor') return;

    setIsGesturing(false);
    
    if (gesture.current.mode === 'swipe') {
      const dx = clientX - gesture.current.startX;
      const dy = clientY - gesture.current.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      if (absDx > 30 && absDx > absDy) {
        if (dx > 0) prevFlip(); 
        else nextFlip(); 
      }
    }
    
    if (gesture.current.mode === 'pinch') {
       if (zoomLevel < 1.1) setZoomLevel(1);
    }
    
    gesture.current.mode = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTool !== 'cursor') return;

    if (e.touches.length === 2) {
      setIsGesturing(true);
      gesture.current.mode = 'pinch';
      gesture.current.startDist = getDistance(e.touches);
      gesture.current.startZoom = zoomLevel;
    } else if (e.touches.length === 1) {
      const mode = zoomLevel > 1 ? 'pan' : 'swipe';
      startGesture(e.touches[0].clientX, e.touches[0].clientY, mode);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeTool !== 'cursor') return;

    if (gesture.current.mode === 'pinch' && e.touches.length === 2) {
      const dist = getDistance(e.touches);
      const scale = (dist / gesture.current.startDist) * gesture.current.startZoom;
      setZoomLevel(Math.min(Math.max(scale, 0.5), 4));
    } else if (e.touches.length === 1) {
      moveGesture(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeTool !== 'cursor') return;
    const touch = e.changedTouches[0];
    endGesture(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || activeTool !== 'cursor') return;
    e.preventDefault(); 
    const mode = zoomLevel > 1 ? 'pan' : 'swipe';
    startGesture(e.clientX, e.clientY, mode);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool !== 'cursor') return;
    if (gesture.current.mode !== 'none') {
       e.preventDefault();
       moveGesture(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (activeTool !== 'cursor') return;
    if (gesture.current.mode !== 'none') {
       endGesture(e.clientX, e.clientY);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (activeTool !== 'cursor') return;
    if (gesture.current.mode !== 'none') {
       endGesture(e.clientX, e.clientY);
    }
  };

  const helpContent = (
    <>
      <h4 className="font-bold text-sm mb-3 border-b pb-2">راهنمای ابزارها</h4>
      <ul className="space-y-3 text-xs text-skin-text">
        <li className="flex items-start gap-2">
          <MousePointer2 size={16} className="text-skin-muted mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">جابجایی:</span>
            برای ورق زدن صفحات با کشیدن موس یا لمس صفحه.
          </div>
        </li>
        <li className="flex items-start gap-2">
          <Highlighter size={16} className="text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">هایلایت:</span>
            روی متن بکشید تا هایلایت شود.
          </div>
        </li>
        <li className="flex items-start gap-2">
          <StickyNote size={16} className="text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">یادداشت:</span>
            روی هر قسمت صفحه کلیک کنید تا یادداشت اضافه شود.
          </div>
        </li>
      </ul>
      <button onClick={() => setShowHelp(false)} className="w-full mt-3 bg-skin-control-bg hover:bg-skin-control-hover text-xs py-1.5 rounded-lg font-bold">متوجه شدم</button>
    </>
  );

  return (
    <div 
        ref={(el) => {
            containerRef.current = el;
            dialogRef.current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-label="نمایش کاتالوگ"
        tabIndex={-1}
        className="fixed inset-0 z-50 flex bg-skin-overlay backdrop-blur-md animate-fade-in touch-none select-none overflow-hidden"
    >
      <div className="flex-grow flex flex-col h-full relative">
        
        {/* --- TOP PANEL --- */}
        <div 
            className={`flex flex-col border-b border-skin-border bg-skin-base/95 backdrop-blur-md z-20 shadow-sm transition-transform duration-300 absolute top-0 left-0 right-0 ${showTopPanel ? 'translate-y-0' : '-translate-y-full'}`}
        >
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2 min-w-0">
                    {hasToc && (
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setShowToc(v => !v)}
                                aria-label="فهرست مطالب"
                                title="فهرست مطالب"
                                className={`p-2 rounded-lg border border-skin-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${showToc ? 'bg-skin-primary text-white' : 'bg-skin-control-bg text-skin-control-text hover:bg-skin-control-hover'}`}
                            >
                                <List size={18} />
                            </button>
                            {showToc && (
                                <div className="absolute top-full right-0 mt-2 w-60 bg-skin-card border border-skin-border rounded-xl shadow-xl p-2 z-50 animate-fade-in max-h-72 overflow-y-auto">
                                    <p className="text-xs font-bold text-skin-muted px-2 py-1.5 border-b border-skin-border mb-1">فهرست مطالب</p>
                                    {catalog.toc!.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { goToPage(item.page); setShowToc(false); }}
                                            className="w-full flex items-center justify-between gap-2 text-right px-2 py-2 rounded-lg text-sm text-skin-text hover:bg-skin-control-bg transition-colors"
                                        >
                                            <span className="line-clamp-1">{item.title}</span>
                                            <span className="text-[10px] text-skin-muted shrink-0 bg-skin-control-bg px-1.5 py-0.5 rounded">ص {item.page + 1}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-skin-text font-bold text-lg leading-tight line-clamp-1">{catalog.title}</h2>
                        <div className="flex items-center gap-2 text-skin-muted text-xs mt-0.5">
                            <span>صفحه {currentPage + 1} از {totalPages || catalog.pages.length}</span>
                        </div>
                    </div>
                </div>

                {/* Desktop Controls */}
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-1 bg-skin-control-bg rounded-lg p-1 border border-skin-border mr-2 relative">
                        {/* Annotation Tools */}
                        <div className="flex items-center gap-1 border-l border-gray-300 pl-2 ml-1">
                            <button 
                                onClick={() => setActiveTool('cursor')} 
                                aria-label="حالت جابجایی و ورق زدن"
                                className={`p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${activeTool === 'cursor' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-control-text hover:bg-skin-control-hover'}`} 
                                title="جابجایی و ورق زدن"
                            >
                                <MousePointer2 size={18} />
                            </button>
                            <button 
                                onClick={() => setActiveTool('highlight')} 
                                aria-label="هایلایت"
                                className={`p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${activeTool === 'highlight' ? 'bg-yellow-200 text-yellow-900 shadow-sm' : 'text-skin-control-text hover:bg-skin-control-hover'}`} 
                                title="هایلایت متن"
                            >
                                <Highlighter size={18} />
                            </button>
                            <button
                                onClick={() => setActiveTool('note')}
                                aria-label="افزودن یادداشت"
                                className={`p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${activeTool === 'note' ? 'bg-yellow-200 text-yellow-900 shadow-sm' : 'text-skin-control-text hover:bg-skin-control-hover'}`}
                                title="افزودن یادداشت"
                            >
                                <StickyNote size={18} />
                            </button>
                            <button
                                onClick={handleExportNotes}
                                aria-label="خروجی یادداشت‌ها (JSON)"
                                className="p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary text-skin-control-text hover:bg-skin-control-hover"
                                title="خروجی یادداشت‌ها"
                            >
                                <PackageOpen size={18} />
                            </button>
                            {/* Help Button */}
                            <button
                                onClick={() => setShowHelp(!showHelp)}
                                aria-label="راهنمای ابزارها"
                                className={`p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${showHelp ? 'bg-blue-100 text-blue-700' : 'text-skin-control-text hover:bg-skin-control-hover'}`}
                                title="راهنمای ابزارها"
                            >
                                <Info size={18} />
                            </button>

                            {/* Help Tooltip */}
                            {showHelp && (
                                <div className="absolute top-full left-0 mt-3 w-64 bg-white border border-skin-border rounded-xl shadow-xl p-4 z-50 animate-fade-in text-right">
                                    {helpContent}
                                </div>
                            )}
                        </div>
                        
                        {/* View Mode Toggle */}
                        <button onClick={() => setForceSinglePage(!forceSinglePage)} aria-label={forceSinglePage ? 'مشاهده دو صفحه' : 'مشاهده تک صفحه'} className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary" title={forceSinglePage ? "مشاهده دو صفحه" : "مشاهده تک صفحه"}>
                            {forceSinglePage ? <Book size={18} /> : <Smartphone size={18} />}
                        </button>
                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                        
                        <button onClick={handleZoomOut} aria-label="کوچک‌نمایی" className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary"><ZoomOut size={18} /></button>
                        <span className="text-xs w-8 text-center tabular-nums text-skin-muted select-none">{Math.round(zoomLevel * 100)}%</span>
                        <button onClick={handleZoomIn} aria-label="بزرگ‌نمایی" className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary"><ZoomIn size={18} /></button>
                        
                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                        
                        <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} aria-label={isSoundEnabled ? 'قطع صدای ورق زدن' : 'فعال‌سازی صدای ورق زدن'} className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                            {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                        <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'} className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                        <button onClick={handleSaveOffline} disabled={isCaching} aria-label="ذخیره آفلاین PWA" title="ذخیره آفلاین" className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary disabled:opacity-50">
                            {isCaching ? <div className="w-4 h-4 rounded-full border-2 border-skin-primary border-t-transparent animate-spin"/> : <DownloadCloud size={18} />}
                        </button>
                        <button onClick={handleDownload} aria-label="دانلود" className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                            <FileDown size={18} />
                        </button>
                        <button onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success('لینک صفحه کپی شد!');
                        }} aria-label="اشتراک‌گذاری" title="اشتراک‌گذاری" className="p-2 text-skin-control-text hover:bg-skin-control-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                            <Share2 size={18} />
                        </button>
                    </div>
                    <button onClick={onClose} aria-label="بستن" className="p-2 rounded-full bg-skin-control-bg text-skin-control-text hover:bg-red-500 hover:text-white transition-colors border border-skin-border pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                        <X size={20} />
                    </button>
                </div>
            </div>
            
            {/* Top Collapse Button */}
            <div className="flex justify-center -mb-3 pb-1">
                 <button onClick={() => setShowTopPanel(false)} aria-label="بستن نوار بالا" className="bg-skin-card border border-skin-border rounded-full p-1 shadow-sm text-skin-muted hover:text-skin-primary hover:bg-skin-control-bg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                    <ChevronUp size={16} />
                 </button>
            </div>
        </div>

        {/* Floating Top Expand Button */}
        <button 
            onClick={() => setShowTopPanel(true)}
            aria-label="باز کردن نوار بالا"
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-skin-card/80 backdrop-blur-sm border border-skin-border rounded-full p-2 shadow-lg text-skin-muted hover:text-skin-primary transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${!showTopPanel ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
        >
            <ChevronDown size={20} />
        </button>

        {/* Book Container */}
        <div 
            className={`flex-grow flex items-center justify-center relative w-full h-full overflow-hidden pb-20 pt-20 ${activeTool === 'cursor' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
            <button onClick={(e) => { e.stopPropagation(); nextFlip(); }} aria-label="صفحه بعد" className={`hidden md:flex absolute right-6 z-10 p-3 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-full shadow-lg transition-all hover:scale-110 backdrop-blur-sm border border-white/20 group opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}>
                <ChevronRight size={24} className="group-active:translate-x-1 transition-transform" />
            </button>
            
            <button onClick={(e) => { e.stopPropagation(); prevFlip(); }} aria-label="صفحه قبل" className={`hidden md:flex absolute left-6 z-10 p-3 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-full shadow-lg transition-all hover:scale-110 backdrop-blur-sm border border-white/20 group opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}>
                <ChevronLeft size={24} className="group-active:-translate-x-1 transition-transform" />
            </button>

            <div 
                style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                    transition: isGesturing ? 'none' : 'transform 0.2s ease-out',
                    transformOrigin: 'center center',
                }}
                className="flex items-center justify-center relative"
            >
                {/* Visual cues for page flipping */}
                {zoomLevel <= 1 && totalPages > 0 && activeTool === 'cursor' && (
                    <>
                        {currentPage < totalPages - 1 && (
                            <div className="absolute -bottom-2 -left-2 w-16 h-16 z-10 cursor-pointer group transition-all duration-300 hover:scale-125" onClick={(e) => { e.stopPropagation(); nextFlip(); }}>
                                <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-tr from-black/30 via-transparent to-transparent rounded-bl-2xl transition-all group-hover:from-skin-primary/40" />
                                <div className="absolute bottom-0 left-0 w-0 h-0 border-b-[24px] border-l-[24px] border-b-white border-l-transparent shadow-lg rotate-90 transition-all group-hover:border-b-[32px] group-hover:border-l-[32px]" />
                            </div>
                        )}
                        {currentPage > 0 && (
                            <div className="absolute -bottom-2 -right-2 w-16 h-16 z-10 cursor-pointer group transition-all duration-300 hover:scale-125" onClick={(e) => { e.stopPropagation(); prevFlip(); }}>
                                <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-black/30 via-transparent to-transparent rounded-br-2xl transition-all group-hover:from-skin-primary/40" />
                                <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[24px] border-r-[24px] border-b-white border-r-transparent shadow-lg -rotate-90 transition-all group-hover:border-b-[32px] group-hover:border-r-[32px]" />
                            </div>
                        )}
                    </>
                )}

                {/* @ts-ignore */}
                <HTMLFlipBook
                    key={`${dimensions.width}-${forceSinglePage}-${usePdfMode}`} 
                    width={dimensions.width}
                    height={dimensions.height}
                    size="fixed"
                    minWidth={300}
                    maxWidth={3000}
                    minHeight={400}
                    maxHeight={4000}
                    maxShadowOpacity={0.5}
                    showCover={false}
                    mobileScrollSupport={false}
                    onFlip={onFlip}
                    onInit={onInit}
                    ref={bookRef}
                    className={`shadow-2xl transition-opacity duration-500 ${dimensions.width === 400 || (usePdfMode && isLoadingPdf) ? 'opacity-0' : 'opacity-100'}`}
                    style={{ margin: '0 auto' }}
                    usePortrait={isMobile || forceSinglePage}
                    startPage={initialPage}
                    drawShadow={true}
                    flippingTime={800}
                    useMouseEvents={false} // Disable built-in mouse events to control gestures/tools manually
                    swipeDistance={10000}
                >
                    {usePdfMode && pdfDoc ? (
                        Array.from(new Array(pdfDoc.numPages), (_, index) => (
                            <PdfPage 
                                key={`pdf-${index}`} 
                                doc={pdfDoc} 
                                pageNumber={index + 1}
                                onRendered={(dataUrl) => {
                                    setPdfThumbnails(prev => ({ ...prev, [index]: dataUrl }));
                                }}
                            >
                                <AnnotationLayer 
                                    pageIndex={index}
                                    isActivePage={index === currentPage}
                                    activeTool={activeTool}
                                    annotations={annotations[index] || []}
                                    closeSignal={closeSignal}
                                    layoutKey={layoutKey}
                                    onAdd={(ann) => handleAddAnnotation(index, ann)}
                                    onUpdate={(id, content) => handleUpdateAnnotation(index, id, content)}
                                    onDelete={(id) => handleDeleteAnnotation(index, id)}
                                />
                            </PdfPage>
                        ))
                    ) : (
                        catalog.pages.map((pageUrl, index) => (
                            <Page number={index + 1} key={index}>
                                 <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                                    <img 
                                        src={pageUrl} 
                                        alt={`Page ${index + 1}`} 
                                        className="w-full h-full object-contain select-none pointer-events-none bg-white"
                                        loading={index < 4 ? "eager" : "lazy"}
                                        onDragStart={(e) => e.preventDefault()}
                                    />
                                    <AnnotationLayer 
                                        pageIndex={index}
                                        isActivePage={index === currentPage}
                                        activeTool={activeTool}
                                        annotations={annotations[index] || []}
                                        closeSignal={closeSignal}
                                        layoutKey={layoutKey}
                                        onAdd={(ann) => handleAddAnnotation(index, ann)}
                                        onUpdate={(id, content) => handleUpdateAnnotation(index, id, content)}
                                        onDelete={(id) => handleDeleteAnnotation(index, id)}
                                    />
                                 </div>
                            </Page>
                        ))
                    )}
                </HTMLFlipBook>
            </div>
        </div>

        {/* --- BOTTOM PANEL (Thumbnails + Mobile Toolbar) --- */}
        <div className={`absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300 ${showBottomPanel ? 'translate-y-0' : 'translate-y-full'}`}>
             
             {/* Bottom Collapse Button */}
             <div className="flex justify-center -mt-3 pt-1 pointer-events-none">
                 <button onClick={() => setShowBottomPanel(false)} aria-label="بستن نوار پایین" className="pointer-events-auto bg-skin-card border border-skin-border rounded-full p-1 shadow-sm text-skin-muted hover:text-skin-primary hover:bg-skin-control-bg transition-colors relative z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                    <ChevronDown size={16} />
                 </button>
             </div>

            {/* Mobile Toolbar (Above Thumbnails) */}
            <div 
                className={`md:hidden bg-skin-card border-t border-skin-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]`}
            >
                <div className="flex flex-col gap-2 px-4 py-2">
                    {/* Mobile Annotation Tools */}
                    <div className="flex justify-center items-center gap-2 py-1 border-b border-gray-100 pb-2 mb-1">
                        <button onClick={() => setActiveTool('cursor')} aria-label="حالت جابجایی و ورق زدن" className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${activeTool === 'cursor' ? 'bg-skin-control-hover text-skin-primary' : 'text-skin-muted'}`}><MousePointer2 size={18} /></button>
                        <button onClick={() => setActiveTool('highlight')} aria-label="هایلایت" className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${activeTool === 'highlight' ? 'bg-yellow-100 text-yellow-800' : 'text-skin-muted'}`}><Highlighter size={18} /></button>
                        <button onClick={() => setActiveTool('note')} aria-label="افزودن یادداشت" className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${activeTool === 'note' ? 'bg-yellow-100 text-yellow-800' : 'text-skin-muted'}`}><StickyNote size={18} /></button>
                        <button onClick={() => setShowHelp(!showHelp)} aria-label="راهنمای ابزارها" className={`p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${showHelp ? 'bg-blue-100 text-blue-700' : 'text-skin-muted'}`}><Info size={18} /></button>
                    </div>
                    {showHelp && (
                        <div className="bg-white border border-skin-border rounded-xl shadow-sm p-3 text-right animate-fade-in">
                            {helpContent}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <button onClick={nextFlip} aria-label="صفحه بعد" className="p-3 rounded-xl bg-skin-control-bg text-skin-control-text active:bg-skin-primary active:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                            <ChevronRight size={24} />
                        </button>
                        
                        <div className="flex gap-2 px-1 text-skin-muted items-center justify-center overflow-x-auto scrollbar-hide flex-nowrap shrink-0 max-w-[200px] sm:max-w-[300px]">
                            <button onClick={handleZoomOut} aria-label="کوچک‌نمایی" className="p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary shrink-0"><ZoomOut size={18} /></button>
                            <button onClick={handleZoomIn} aria-label="بزرگ‌نمایی" className="p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary shrink-0"><ZoomIn size={18} /></button>
                            <button onClick={handleSaveOffline} disabled={isCaching} aria-label="ذخیره آفلاین PWA" title="ذخیره آفلاین" className="p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary disabled:opacity-50 shrink-0">
                                {isCaching ? <div className="w-4 h-4 rounded-full border-2 border-skin-primary border-t-transparent animate-spin"/> : <DownloadCloud size={18} />}
                            </button>
                            <button onClick={handleDownload} aria-label="دانلود" title="دانلود" className="p-2 md:p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary shrink-0"><FileDown size={18} /></button>
                            <button onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success('لینک صفحه کپی شد!');
                            }} aria-label="اشتراک‌گذاری" title="اشتراک‌گذاری" className="p-2 md:p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary shrink-0">
                                <Share2 size={18} />
                            </button>
                        </div>

                        <button onClick={prevFlip} aria-label="صفحه قبل" className="p-3 rounded-xl bg-skin-control-bg text-skin-control-text active:bg-skin-primary active:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary">
                            <ChevronLeft size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Thumbnail Strip */}
            <div ref={thumbStripRef} className={`h-20 bg-skin-card/90 backdrop-blur-md border-t border-skin-border flex items-center px-4 gap-2 overflow-x-auto`}>
                 {usePdfMode && pdfDoc ? (
                     Array.from(new Array(pdfDoc.numPages), (_, idx) => (
                         <button
                            key={`thumb-${idx}`}
                            data-thumb={idx}
                            onClick={() => goToPage(idx)}
                            aria-label={`رفتن به صفحه ${idx + 1}`}
                            className={`shrink-0 h-16 w-12 rounded border-2 overflow-hidden transition-all flex items-center justify-center bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${currentPage === idx ? 'border-skin-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                         >
                             {pdfThumbnails[idx] ? (
                                 <img src={pdfThumbnails[idx]} className="w-full h-full object-cover" loading="lazy" />
                             ) : (
                                 <span className="text-[10px] text-gray-400 font-medium">{idx + 1}</span>
                             )}
                         </button>
                     ))
                 ) : (
                     catalog.pages.map((page, idx) => (
                         <button
                            key={idx}
                            data-thumb={idx}
                            onClick={() => goToPage(idx)}
                            aria-label={`رفتن به صفحه ${idx + 1}`}
                            className={`shrink-0 h-16 w-12 rounded border-2 overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${currentPage === idx ? 'border-skin-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                         >
                             <img src={page} className="w-full h-full object-cover" loading="lazy" />
                         </button>
                     ))
                 )}
            </div>
        </div>

        {/* Floating Bottom Expand Button */}
        <button 
            onClick={() => setShowBottomPanel(true)}
            aria-label="باز کردن نوار پایین"
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-skin-card/80 backdrop-blur-sm border border-skin-border rounded-full p-2 shadow-lg text-skin-muted hover:text-skin-primary transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${!showBottomPanel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}
        >
            <ChevronUp size={20} />
        </button>

      </div>
    </div>
  );
};

export default BookViewer;
