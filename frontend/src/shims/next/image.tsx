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

  // Automatically compute webp source if it's a PNG/JPG in public
  const webpSrc = typeof src === 'string' && (src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.jpeg'))
    ? src.replace(/\.(png|jpg|jpeg)$/i, '.webp')
    : undefined;

  if (fill) {
    return (
      <picture className="contents">
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
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
      </picture>
    );
  }

  return (
    <picture className="contents">
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
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
    </picture>
  );
}
