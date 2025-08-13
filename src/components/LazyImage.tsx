import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { ImageOff } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
}

export function LazyImage({ src, alt, fallback, className, ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '50px 0px'
  });

  useEffect(() => {
    if (inView && !loaded) {
      const img = new Image();
      img.src = src;
      img.onload = () => setLoaded(true);
      img.onerror = () => setError(true);
    }
  }, [inView, src, loaded]);

  if (error) {
    return (
      <div 
        ref={ref}
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        {...props}
      >
        <ImageOff className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      {inView && (
        <img
          src={loaded ? src : fallback || 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='}
          alt={alt}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          {...props}
        />
      )}
    </div>
  );
}