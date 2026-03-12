import { NextRequest, NextResponse } from 'next/server';
import { getTheoryConfig } from '@/types/theory';
import { getTopicContent, serializeMDX } from '@/lib/mdx';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const courseId = params.courseId;
  const theoryConfig = getTheoryConfig(courseId);

  if (!theoryConfig) {
    return NextResponse.json(
      { error: 'Cours non trouvé' },
      { status: 404 }
    );
  }

  try {
    const topicsPromises = theoryConfig.topics.map(async (topic) => {
      const content = getTopicContent(courseId, topic.slug);

      if (!content) {
        return {
          slug: topic.slug,
          title: topic.title,
          description: topic.description,
          content: null,
        };
      }

      const serializedContent = await serializeMDX(content.content);

      return {
        slug: topic.slug,
        title: content.frontmatter.title || topic.title,
        description: content.frontmatter.description || topic.description,
        content: serializedContent,
      };
    });

    const topics = await Promise.all(topicsPromises);

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Error loading theory content:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement du contenu' },
      { status: 500 }
    );
  }
}
