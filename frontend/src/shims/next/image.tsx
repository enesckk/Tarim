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
  const isEager = priority || loading === 'eager';
  const imgLoading = isEager ? 'eager' : 'lazy';
  const decoding = isEager ? 'sync' : 'async';
  const fetchPriority = isEager ? 'high' : 'low';

  if (fill) {
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
        loading={imgLoading}
        decoding={decoding as any}
        // @ts-ignore
        fetchPriority={fetchPriority}
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
      loading={imgLoading}
      decoding={decoding as any}
      // @ts-ignore
      fetchPriority={fetchPriority}
      draggable={draggable as any}
      {...rest}
    />
  );
}
