'use client';

import { useRouter } from 'next/navigation';
import { COURSES, COURSE_COLORS, type CourseId } from '@/types/course';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface CourseSelectorProps {
  onSelect?: (courseId: CourseId) => void;
}

export function CourseSelector({ onSelect }: CourseSelectorProps) {
  const router = useRouter();
  const setSelectedCourse = useAppStore((state) => state.setSelectedCourse);

  const handleSelectCourse = (courseId: CourseId) => {
    setSelectedCourse(courseId);
    if (onSelect) {
      onSelect(courseId);
    } else {
      router.push(`/course/${courseId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Phet-ford
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plateforme d'apprentissage interactive pour la physique au CÉGEP.
            Choisissez votre cours pour commencer.
          </p>
        </div>

        {/* Course Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {COURSES.map((course) => {
            const colors = COURSE_COLORS[course.id];
            return (
              <Card
                key={course.id}
                variant="elevated"
                className={`
                  group cursor-pointer transition-all duration-300
                  hover:shadow-xl hover:-translate-y-1
                  border-2 border-transparent hover:${colors.border}
                `}
                onClick={() => handleSelectCourse(course.id)}
              >
                <CardContent className="p-6">
                  {/* Icon */}
                  <div className={`
                    w-16 h-16 rounded-2xl ${colors.bg}
                    flex items-center justify-center text-3xl
                    mb-6 group-hover:scale-110 transition-transform
                  `}>
                    {course.icon}
                  </div>

                  {/* Course Code */}
                  <p className={`text-sm font-medium ${colors.text} mb-2`}>
                    {course.code}
                  </p>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    {course.title}
                  </h2>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    {course.description}
                  </p>

                  {/* Modules count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {course.modules.length} modules
                    </span>
                    <Button
                      size="sm"
                      className={`${colors.bg} text-white hover:opacity-90`}
                    >
                      Accéder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Plateforme d'apprentissage pour les cours de physique au CÉGEP
          </p>
        </div>
      </div>
    </div>
  );
}

export default CourseSelector;
