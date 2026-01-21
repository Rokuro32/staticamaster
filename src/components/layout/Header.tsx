'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { getCourseById, COURSE_COLORS, type CourseId } from '@/types/course';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const selectedCourse = useAppStore((state) => state.selectedCourse);
  const resetCourseContext = useAppStore((state) => state.resetCourseContext);

  // Ne pas afficher le header sur la page de sélection de cours
  if (pathname === '/' && !selectedCourse) {
    return null;
  }

  const course = selectedCourse ? getCourseById(selectedCourse) : null;
  const colors = selectedCourse ? COURSE_COLORS[selectedCourse] : null;

  const handleChangeCourse = () => {
    resetCourseContext();
    router.push('/');
  };

  const navItems = selectedCourse ? [
    { href: `/course/${selectedCourse}`, label: 'Accueil', icon: '🏠' },
    { href: `/course/${selectedCourse}/modules`, label: 'Modules', icon: '📚' },
    ...(selectedCourse === 'waves_modern' ? [{ href: `/course/${selectedCourse}/simulations`, label: 'Simulations', icon: '🔬' }] : []),
    { href: `/course/${selectedCourse}/progress`, label: 'Progression', icon: '📊' },
  ] : [];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Course Name */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleChangeCourse}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-xl font-bold text-gray-900">
                PhysicsMaster
              </span>
            </button>

            {course && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-2">
                  <span className={`
                    px-2 py-1 rounded-md text-sm font-medium
                    ${colors?.bg} text-white
                  `}>
                    {course.icon} {course.shortTitle}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          {selectedCourse && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== `/course/${selectedCourse}` && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? `${colors?.bg} text-white`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {selectedCourse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeCourse}
                className="text-gray-600 hover:text-gray-900"
              >
                Changer de cours
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {selectedCourse && (
        <div className="md:hidden border-t border-gray-100">
          <div className="flex overflow-x-auto px-4 py-2 gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== `/course/${selectedCourse}` && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? `${colors?.bg} text-white`
                      : 'text-gray-600 bg-gray-100'
                  )}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
