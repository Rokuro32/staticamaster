import { NextRequest, NextResponse } from 'next/server';
import { getQuestionById } from '@/lib/questions';
import { validateAnswer, DEFAULT_VALIDATION_CONFIG } from '@/lib/validation';
import type { UserAnswer } from '@/types/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, answer } = body as {
      questionId: string;
      answer: UserAnswer;
    };

    if (!questionId || !answer) {
      return NextResponse.json(
        { error: 'questionId et answer sont requis' },
        { status: 400 }
      );
    }

    // Récupérer la question
    const question = getQuestionById(questionId);

    if (!question) {
      return NextResponse.json(
        { error: 'Question non trouvée' },
        { status: 404 }
      );
    }

    // Valider la réponse
    const result = validateAnswer(question, answer, DEFAULT_VALIDATION_CONFIG);

    return NextResponse.json({
      result,
      questionId,
    });
  } catch (error) {
    console.error('Erreur API validate:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la validation' },
      { status: 500 }
    );
  }
}
