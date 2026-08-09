import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  unoptimized?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'eager' | 'lazy';
  draggable?: boolean | 'true' | 'false';
  'aria-hidden'?: boolean | 'true' | 'false';
  [key: string]: any;
}

export default function Image({
  src,
  alt,
  fill,
  width,
  height,
  className,
  style,
  loading,
  priority,
  unoptimized,
  quality,
  sizes,
  draggable,
  ...rest
}: ImageProps) {
  if (fill) {
    // When fill is used, the image must be positioned absolute to fill the parent.
    // The parent container MUST have position: relative/absolute/fixed.
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          ...style,
        }}
        loading={priority ? 'eager' : loading}
        draggable={draggable as any}
        {...rest}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      loading={priority ? 'eager' : loading}
      draggable={draggable as any}
      {...rest}
    />
  );
}
