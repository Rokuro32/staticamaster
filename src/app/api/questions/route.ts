import { NextRequest, NextResponse } from 'next/server';
import {
  loadAllQuestions,
  loadQuestionsByCourse,
  getQuestionsByModule,
  generateQuiz,
  saveQuestion,
  getQuestionStats,
} from '@/lib/questions';
import type { ModuleId } from '@/types/question';
import type { CourseId } from '@/types/course';
import { COURSES, getModulesByCourse } from '@/types/course';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') as CourseId | null;
    const moduleId = searchParams.get('moduleId');
    const count = parseInt(searchParams.get('count') || '5');
    const seed = searchParams.get('seed');
    const all = searchParams.get('all') === 'true';
    const stats = searchParams.get('stats') === 'true';

    // Retourner les statistiques
    if (stats) {
      const questionStats = getQuestionStats(courseId || undefined);
      return NextResponse.json({ stats: questionStats, courseId });
    }

    // Retourner toutes les questions
    if (all) {
      const questions = courseId
        ? loadQuestionsByCourse(courseId)
        : loadAllQuestions();
      return NextResponse.json({ questions, courseId });
    }

    // Retourner les questions d'un module spécifique
    if (moduleId) {
      const parsedModuleId = parseInt(moduleId) as ModuleId;

      // Valider le moduleId selon le cours
      if (courseId) {
        const modules = getModulesByCourse(courseId);
        const validModuleIds = modules.map(m => m.id);
        if (!validModuleIds.includes(parsedModuleId)) {
          return NextResponse.json(
            { error: `Module ID invalide pour le cours ${courseId}. Valides: ${validModuleIds.join(', ')}` },
            { status: 400 }
          );
        }
      }

      // Générer un quiz avec des variantes
      const questions = generateQuiz(
        parsedModuleId,
        count,
        seed ? parseInt(seed) : undefined,
        courseId || undefined
      );

      return NextResponse.json({
        questions,
        courseId: courseId || 'statics',
        moduleId: parsedModuleId,
        count: questions.length,
        seed: seed || 'random',
      });
    }

    // Par défaut, retourner toutes les questions du cours ou globales
    const questions = courseId
      ? loadQuestionsByCourse(courseId)
      : loadAllQuestions();

    return NextResponse.json({
      questions,
      courseId,
      total: questions.length,
    });
  } catch (error) {
    console.error('Erreur API questions:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation basique
    if (!body.id || !body.module || !body.statement) {
      return NextResponse.json(
        { error: 'Données de question incomplètes' },
        { status: 400 }
      );
    }

    // Valider le courseId
    const courseId = body.courseId as CourseId || 'statics';
    if (!COURSES.find(c => c.id === courseId)) {
      return NextResponse.json(
        { error: 'Course ID invalide' },
        { status: 400 }
      );
    }

    // Sauvegarder la question
    saveQuestion({ ...body, courseId }, courseId);

    return NextResponse.json({
      success: true,
      message: 'Question sauvegardée',
      questionId: body.id,
      courseId,
    });
  } catch (error) {
    console.error('Erreur API questions POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la question' },
      { status: 500 }
    );
  }
}
