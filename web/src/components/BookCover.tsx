'use client';

import React from 'react';

interface BookCoverProps {
  title: string;
  author: string;
  className?: string;
}

export default function BookCover({ title, author, className = '' }: BookCoverProps) {
  return (
    <div className={`book-cover ${className}`}>
      <div className="book-cover-ornament-top" />
      <div className="book-cover-title">{title}</div>
      <div className="book-cover-author">{author}</div>
      <div className="book-cover-ornament-bottom" />
    </div>
  );
}
