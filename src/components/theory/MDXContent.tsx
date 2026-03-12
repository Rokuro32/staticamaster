'use client';

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { MDXComponents } from 'mdx/types';
import { Definition, Formula, Example, Note, Table, Section, Subsection } from './TheoryComponents';
import 'katex/dist/katex.min.css';

// MDX components mapping
const components: MDXComponents = {
  Definition,
  Formula,
  Example,
  Note,
  Table,
  Section,
  Subsection,
  // Override default HTML elements for better styling
  h1: (props) => (
    <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3" {...props} />
  ),
  h4: (props) => (
    <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2" {...props} />
  ),
  p: (props) => (
    <p className="text-gray-700 leading-relaxed my-3" {...props} />
  ),
  ul: (props) => (
    <ul className="list-disc list-inside my-4 space-y-2 text-gray-700" {...props} />
  ),
  ol: (props) => (
    <ol className="list-decimal list-inside my-4 space-y-2 text-gray-700" {...props} />
  ),
  li: (props) => (
    <li className="leading-relaxed" {...props} />
  ),
  table: (props) => (
    <div className="my-6 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="px-4 py-3 bg-gray-100 text-left text-sm font-semibold text-gray-900 border-b" {...props} />
  ),
  td: (props) => (
    <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600" {...props} />
  ),
  code: (props) => (
    <code className="bg-gray-100 rounded px-1.5 py-0.5 text-sm font-mono text-violet-700" {...props} />
  ),
  pre: (props) => (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto text-sm" {...props} />
  ),
  hr: () => <hr className="my-8 border-t border-gray-200" />,
  strong: (props) => (
    <strong className="font-semibold text-gray-900" {...props} />
  ),
  em: (props) => (
    <em className="italic" {...props} />
  ),
  a: (props) => (
    <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
  ),
};

interface MDXContentProps {
  source: MDXRemoteSerializeResult;
}

export function MDXContent({ source }: MDXContentProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <MDXRemote {...source} components={components} />
    </div>
  );
}
