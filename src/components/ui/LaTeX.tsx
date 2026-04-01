'use client';

import { useMemo } from 'react';
import katex from 'katex';

interface LaTeXProps {
  math: string;
  block?: boolean;
  errorColor?: string;
}

function renderLatex(math: string, displayMode: boolean, errorColor: string): string {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      errorColor,
    });
  } catch {
    return math;
  }
}

export function InlineMath({ math, errorColor = '#cc0000' }: LaTeXProps) {
  const html = useMemo(() => renderLatex(math, false, errorColor), [math, errorColor]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function BlockMath({ math, errorColor = '#cc0000' }: LaTeXProps) {
  const html = useMemo(() => renderLatex(math, true, errorColor), [math, errorColor]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
