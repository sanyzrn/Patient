import React, { useRef, useEffect } from 'react';
import { Video } from '../types';
import { X, Calendar } from 'lucide-react';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-skin-card rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-skin-border bg-skin-base">
          <h3 className="font-bold text-skin-text text-lg pr-2 truncate">{video.title}</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors text-skin-muted"
          >
            <X size={24} />
          </button>
        </div>

        {/* Video Container */}
        <div className="bg-black w-full aspect-video flex items-center justify-center">
            <video 
                ref={videoRef}
                controls 
                autoPlay 
                className="w-full h-full max-h-[70vh]"
                poster={video.coverImage}
            >
                <source src={video.videoUrl} type="video/mp4" />
                مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
            </video>
        </div>

        {/* Footer Info */}
        <div className="p-4 sm:p-6 bg-skin-card overflow-y-auto">
             <div className="flex items-center gap-2 text-skin-muted text-xs mb-3">
                <Calendar size={14} />
                <span>تاریخ انتشار: {video.date}</span>
             </div>
             <p className="text-skin-text text-sm sm:text-base leading-relaxed">
                {video.description}
             </p>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;