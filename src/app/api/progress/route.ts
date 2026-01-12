import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateUser,
  createSession,
  completeSession,
  recordAttempt,
  updateCompetencyProgress,
  getUserStats,
  getUserSessions,
  getUserCompetencyProgress,
} from '@/lib/db';
import type { ModuleId, CompetencyTag } from '@/types/question';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName') || 'Étudiant';

    // Obtenir ou créer l'utilisateur
    const user = getOrCreateUser(userName);
    const actualUserId = userId || user.id;

    // Récupérer les statistiques
    const stats = getUserStats(actualUserId);
    const sessions = getUserSessions(actualUserId, 10);
    const competencies = getUserCompetencyProgress(actualUserId);

    return NextResponse.json({
      user,
      stats,
      sessions,
      competencies,
    });
  } catch (error) {
    console.error('Erreur API progress GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la progression' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      userName = 'Étudiant',
      moduleId,
      questionId,
      answer,
      result,
      sessionId,
      score,
      competencies,
    } = body;

    // Obtenir ou créer l'utilisateur
    const user = getOrCreateUser(userName);

    switch (action) {
      case 'start-session': {
        if (!moduleId) {
          return NextResponse.json(
            { error: 'moduleId requis' },
            { status: 400 }
          );
        }
        const session = createSession(user.id, moduleId as ModuleId);
        return NextResponse.json({ session });
      }

      case 'complete-session': {
        if (!sessionId || score === undefined) {
          return NextResponse.json(
            { error: 'sessionId et score requis' },
            { status: 400 }
          );
        }
        completeSession(sessionId, score);
        return NextResponse.json({ success: true });
      }

      case 'record-attempt': {
        if (!sessionId || !questionId || !answer || !result) {
          return NextResponse.json(
            { error: 'sessionId, questionId, answer et result requis' },
            { status: 400 }
          );
        }

        const attempt = recordAttempt(
          sessionId,
          questionId,
          answer,
          result.isCorrect,
          result.score,
          answer.timeSpent || 0,
          result.feedback
        );

        // Mettre à jour les compétences
        if (competencies && Array.isArray(competencies)) {
          for (const tag of competencies) {
            updateCompetencyProgress(user.id, tag as CompetencyTag, result.isCorrect);
          }
        }

        return NextResponse.json({ attempt });
      }

      default:
        // Enregistrement simple d'une tentative (rétrocompatibilité)
        if (questionId && result) {
          // Créer une session temporaire si nécessaire
          let activeSessionId = sessionId;
          if (!activeSessionId) {
            const session = createSession(user.id, 1); // Module par défaut
            activeSessionId = session.id;
          }

          const attempt = recordAttempt(
            activeSessionId,
            questionId,
            answer || {},
            result.isCorrect,
            result.score,
            0,
            result.feedback
          );

          return NextResponse.json({ attempt, success: true });
        }

        return NextResponse.json(
          { error: 'Action non reconnue' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API progress POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la progression' },
      { status: 500 }
    );
  }
}
