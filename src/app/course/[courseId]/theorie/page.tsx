'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { getCourseById, COURSE_COLORS, type CourseId } from '@/types/course';
import { getTheoryConfig, type TheoryTopic } from '@/types/theory';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { MDXContent } from '@/components/theory/MDXContent';
import { MDXRemoteSerializeResult } from 'next-mdx-remote';

interface TopicData {
  slug: string;
  title: string;
  description?: string;
  content: MDXRemoteSerializeResult | null;
}

export default function TheoriePage() {
  const params = useParams();
  const courseId = params.courseId as CourseId;
  const setSelectedCourse = useAppStore((state) => state.setSelectedCourse);
  const selectedCourse = useAppStore((state) => state.selectedCourse);

  const [activeTab, setActiveTab] = useState<string>('');
  const [topicsData, setTopicsData] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const course = getCourseById(courseId);
  const colors = course ? COURSE_COLORS[courseId] : null;
  const theoryConfig = getTheoryConfig(courseId);

  // Update store with selected course
  useEffect(() => {
    if (courseId && courseId !== selectedCourse) {
      setSelectedCourse(courseId);
    }
  }, [courseId, selectedCourse, setSelectedCourse]);

  // Load theory content
  const loadContent = useCallback(async () => {
    if (!theoryConfig) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all topics content
      const response = await fetch(`/api/theory/${courseId}`);

      if (!response.ok) {
        throw new Error('Impossible de charger le contenu théorique');
      }

      const data = await response.json();
      setTopicsData(data.topics);

      // Set first topic as active if not already set
      if (data.topics.length > 0 && !activeTab) {
        setActiveTab(data.topics[0].slug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [courseId, theoryConfig, activeTab]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  if (!course || !theoryConfig) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Théorie non disponible</h1>
        <p className="text-gray-600">
          Le contenu théorique pour ce cours n&apos;est pas encore disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{course.icon}</span>
          <h1 className="text-3xl font-bold text-gray-900">Théorie</h1>
        </div>
        <p className="text-lg text-gray-600">{course.title}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className={`animate-spin rounded-full h-12 w-12 border-4 border-gray-200 ${colors?.border} border-t-current`}></div>
            <p className="text-gray-600">Chargement du contenu...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadContent}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : topicsData.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Contenu en préparation
          </h3>
          <p className="text-gray-600">
            Le contenu théorique pour ce cours sera bientôt disponible.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Topic Navigation - Horizontal scrollable on mobile, wrapped on desktop */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 overflow-x-auto">
              <TabsList className="flex flex-nowrap md:flex-wrap gap-2 min-w-max md:min-w-0">
                {topicsData.map((topic) => (
                  <TabsTrigger
                    key={topic.slug}
                    value={topic.slug}
                    className={`whitespace-nowrap ${
                      activeTab === topic.slug
                        ? `${colors?.bg} text-white`
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {topic.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-8">
              {topicsData.map((topic) => (
                <TabsContent key={topic.slug} value={topic.slug} className="mt-0">
                  {topic.content ? (
                    <div>
                      {topic.description && (
                        <p className="text-lg text-gray-600 mb-6 pb-4 border-b border-gray-200">
                          {topic.description}
                        </p>
                      )}
                      <MDXContent source={topic.content} />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>Contenu en cours de rédaction...</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      )}

      {/* Quick Navigation Footer */}
      {topicsData.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {theoryConfig.topics.map((topic, index) => (
            <button
              key={topic.slug}
              onClick={() => setActiveTab(topic.slug)}
              className={`p-4 rounded-lg border text-left transition-all ${
                activeTab === topic.slug
                  ? `${colors?.bg} text-white border-transparent`
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {index + 1}. {topic.title}
              </div>
              {topic.description && (
                <div className={`text-xs ${activeTab === topic.slug ? 'text-white/80' : 'text-gray-500'}`}>
                  {topic.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
