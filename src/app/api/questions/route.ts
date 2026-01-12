import { NextRequest, NextResponse } from 'next/server';
import { loadAllQuestions, getQuestionsByModule, generateQuiz } from '@/lib/questions';
import type { ModuleId } from '@/types/question';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const count = parseInt(searchParams.get('count') || '5');
    const seed = searchParams.get('seed');
    const all = searchParams.get('all') === 'true';

    // Retourner toutes les questions
    if (all) {
      const questions = loadAllQuestions();
      return NextResponse.json({ questions });
    }

    // Retourner les questions d'un module spécifique
    if (moduleId) {
      const parsedModuleId = parseInt(moduleId) as ModuleId;

      if (parsedModuleId < 1 || parsedModuleId > 5) {
        return NextResponse.json(
          { error: 'Module ID invalide (1-5)' },
          { status: 400 }
        );
      }

      // Générer un quiz avec des variantes
      const questions = generateQuiz(
        parsedModuleId,
        count,
        seed ? parseInt(seed) : undefined
      );

      return NextResponse.json({
        questions,
        moduleId: parsedModuleId,
        count: questions.length,
        seed: seed || 'random',
      });
    }

    // Par défaut, retourner toutes les questions
    const questions = loadAllQuestions();
    return NextResponse.json({
      questions,
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

    // Sauvegarder la question (TODO: implémenter)
    // saveQuestion(body);

    return NextResponse.json({
      success: true,
      message: 'Question sauvegardée',
      questionId: body.id,
    });
  } catch (error) {
    console.error('Erreur API questions POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la question' },
      { status: 500 }
    );
  }
}
