import React from 'react';
import { Video } from '../types';
import { Play, Clock, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick(video)}
      className="group bg-skin-card border border-skin-border rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:border-skin-primary/30 flex flex-col h-full isolation-isolate"
    >
      <div className="relative aspect-video w-full bg-gray-900 overflow-hidden">
        <img 
          src={video.coverImage} 
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 transform-gpu"
        />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 group-hover:bg-skin-primary group-hover:border-skin-primary transition-colors duration-300 shadow-lg">
                <Play className="text-white fill-white ml-1 w-6 h-6 sm:w-8 sm:h-8" />
            </div>
        </div>
        
        {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-md">
                <Clock size={12} />
                {video.duration}
            </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-skin-text text-base sm:text-lg mb-2 leading-tight group-hover:text-skin-primary transition-colors line-clamp-2">
          {video.title}
        </h3>
        
        <p className="text-skin-muted text-xs sm:text-sm line-clamp-2 mb-4 flex-grow">
          {video.description}
        </p>
        
        <div className="flex items-center text-skin-muted text-[10px] sm:text-xs pt-3 border-t border-skin-border mt-auto">
            <Calendar size={12} className="mr-1 ml-1" />
            {video.date}
        </div>
      </div>
    </motion.div>
  );
};

export default VideoCard;