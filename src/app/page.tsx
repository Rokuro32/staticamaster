'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { CourseSelector } from '@/components/course/CourseSelector';

export default function HomePage() {
  const router = useRouter();
  const selectedCourse = useAppStore((state) => state.selectedCourse);

  // Si un cours est déjà sélectionné, rediriger vers la page du cours
  useEffect(() => {
    if (selectedCourse) {
      router.push(`/course/${selectedCourse}`);
    }
  }, [selectedCourse, router]);

  // Afficher le sélecteur de cours
  return <CourseSelector />;
}
