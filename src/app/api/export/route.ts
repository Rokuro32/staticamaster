import { NextRequest, NextResponse } from 'next/server';
import { exportUserData, exportAllData, getUser } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const format = searchParams.get('format') || 'json';
    const all = searchParams.get('all') === 'true';

    let data: object;

    if (all) {
      // Exporter toutes les données (mode enseignant)
      data = exportAllData();
    } else if (userId) {
      // Exporter les données d'un utilisateur
      const user = getUser(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        );
      }
      data = exportUserData(userId);
    } else {
      return NextResponse.json(
        { error: 'userId ou all=true requis' },
        { status: 400 }
      );
    }

    // Format de sortie
    if (format === 'csv') {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="export-${Date.now()}.csv"`,
        },
      });
    }

    // JSON par défaut
    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Erreur API export:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'export' },
      { status: 500 }
    );
  }
}

// Convertir les données en CSV
function convertToCSV(data: object): string {
  const lines: string[] = [];

  // En-tête
  if ('sessions' in data && Array.isArray((data as any).sessions)) {
    const sessions = (data as any).sessions;

    // Sessions
    lines.push('=== SESSIONS ===');
    lines.push('id,userId,moduleId,startedAt,completedAt,score,questionCount,correctCount');
    for (const session of sessions) {
      lines.push([
        session.id,
        session.userId,
        session.moduleId,
        session.startedAt,
        session.completedAt || '',
        session.score || '',
        session.questionCount,
        session.correctCount,
      ].join(','));
    }
    lines.push('');
  }

  if ('attempts' in data && Array.isArray((data as any).attempts)) {
    const attempts = (data as any).attempts;

    // Tentatives
    lines.push('=== TENTATIVES ===');
    lines.push('id,sessionId,questionId,isCorrect,score,timeSpent,attemptedAt');
    for (const attempt of attempts) {
      lines.push([
        attempt.id,
        attempt.sessionId,
        attempt.questionId,
        attempt.isCorrect ? 'Oui' : 'Non',
        attempt.score,
        attempt.timeSpent,
        attempt.attemptedAt,
      ].join(','));
    }
    lines.push('');
  }

  if ('competencyProgress' in data && Array.isArray((data as any).competencyProgress)) {
    const progress = (data as any).competencyProgress;

    // Progression par compétence
    lines.push('=== PROGRESSION PAR COMPÉTENCE ===');
    lines.push('userId,competencyTag,attempts,successes,successRate,lastAttempt');
    for (const p of progress) {
      const successRate = p.attempts > 0 ? ((p.successes / p.attempts) * 100).toFixed(1) : '0';
      lines.push([
        p.userId,
        p.competencyTag,
        p.attempts,
        p.successes,
        `${successRate}%`,
        p.lastAttempt || '',
      ].join(','));
    }
  }

  return lines.join('\n');
}
