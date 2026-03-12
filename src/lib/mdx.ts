import { serialize } from 'next-mdx-remote/serialize';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_PATH = path.join(process.cwd(), 'content/theory');

export interface TheoryFrontmatter {
  title: string;
  description?: string;
  order?: number;
}

export interface TheoryContent {
  frontmatter: TheoryFrontmatter;
  content: string;
}

/**
 * Get all topic slugs for a course
 */
export function getTopicSlugs(courseId: string): string[] {
  const coursePath = path.join(CONTENT_PATH, courseId);

  if (!fs.existsSync(coursePath)) {
    return [];
  }

  const files = fs.readdirSync(coursePath);
  return files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));
}

/**
 * Get raw MDX content for a topic
 */
export function getTopicContent(courseId: string, topicSlug: string): TheoryContent | null {
  const filePath = path.join(CONTENT_PATH, courseId, `${topicSlug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    frontmatter: data as TheoryFrontmatter,
    content,
  };
}

/**
 * Serialize MDX content with math support
 */
export async function serializeMDX(content: string) {
  return serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex as any],
    },
  });
}

/**
 * Get all topics for a course with their content
 */
export async function getAllTopicsForCourse(courseId: string) {
  const slugs = getTopicSlugs(courseId);
  const topics = [];

  for (const slug of slugs) {
    const content = getTopicContent(courseId, slug);
    if (content) {
      topics.push({
        slug,
        ...content,
      });
    }
  }

  // Sort by order if available
  return topics.sort((a, b) => {
    const orderA = a.frontmatter.order ?? 999;
    const orderB = b.frontmatter.order ?? 999;
    return orderA - orderB;
  });
}
