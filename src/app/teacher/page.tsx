'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

interface StudentStat {
  userId: string;
  name: string;
  totalSessions: number;
  averageScore: number | null;
  totalQuestions: number;
  totalCorrect: number;
  lastActivity: string | null;
}

interface QuestionStat {
  id: string;
  module: number;
  title: string;
  attempts: number;
  successRate: number;
  avgTime: number;
}

export default function TeacherPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Charger les données enseignant
    loadStudentStats();
  }, []);

  const loadStudentStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/export?all=true');
      if (response.ok) {
        const data = await response.json();
        // Traiter les données pour obtenir les stats par étudiant
        // TODO: Implémenter l'agrégation côté serveur
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
    setLoading(false);
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/export?all=true&format=csv');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-statique-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur export:', error);
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await fetch('/api/export?all=true&format=json');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-statique-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur export:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mode Enseignant</h1>
          <p className="text-gray-600">Gérez les questions et suivez la progression des étudiants.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="students">Étudiants</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Étudiants actifs" value="--" />
            <StatCard title="Sessions totales" value="--" />
            <StatCard title="Taux de réussite moyen" value="--%" />
            <StatCard title="Questions disponibles" value="25" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Activité récente */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  L'activité sera affichée ici une fois que des étudiants auront commencé à utiliser l'application.
                </p>
              </CardContent>
            </Card>

            {/* Performance par module */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Performance par module</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(moduleId => (
                    <div key={moduleId} className="flex items-center gap-4">
                      <span className="text-sm font-medium w-24">Module {moduleId}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: '0%' }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-12">0%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Liste des étudiants */}
        <TabsContent value="students">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Liste des étudiants</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Nom</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Sessions</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Questions</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Score moyen</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Dernière activité</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.userId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{student.name}</td>
                          <td className="py-3 px-4">{student.totalSessions}</td>
                          <td className="py-3 px-4">
                            {student.totalCorrect}/{student.totalQuestions}
                          </td>
                          <td className="py-3 px-4">
                            {student.averageScore !== null ? (
                              <Badge
                                variant={
                                  student.averageScore >= 70 ? 'success' :
                                  student.averageScore >= 50 ? 'warning' : 'error'
                                }
                              >
                                {student.averageScore.toFixed(0)}%
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {student.lastActivity
                              ? new Date(student.lastActivity).toLocaleDateString('fr-CA')
                              : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">
                              Détails
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Aucun étudiant n'a encore utilisé l'application.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des questions */}
        <TabsContent value="questions">
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Banque de questions</CardTitle>
                <Link href="/teacher/questions">
                  <Button>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Gérer les questions
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(moduleId => (
                  <div
                    key={moduleId}
                    className="p-4 border rounded-lg text-center"
                  >
                    <p className="text-3xl font-bold text-primary-600">5</p>
                    <p className="text-sm text-gray-600">Module {moduleId}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Format des questions</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Les questions sont stockées en format JSON dans le dossier <code className="bg-gray-200 px-1 rounded">data/questions/</code>.
                </p>
                <p className="text-sm text-gray-600">
                  Pour ajouter de nouvelles questions, modifiez les fichiers JSON correspondants ou utilisez l'interface de gestion.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres */}
        <TabsContent value="settings">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Paramètres du quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de questions par quiz
                  </label>
                  <select className="w-full max-w-xs px-3 py-2 border rounded-lg">
                    <option value="5">5 questions</option>
                    <option value="10">10 questions</option>
                    <option value="15">15 questions</option>
                    <option value="20">20 questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tolérance numérique par défaut
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={2}
                      className="w-20 px-3 py-2 border rounded-lg"
                    />
                    <span className="text-gray-600">%</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Activer le crédit partiel
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Afficher les indices aux étudiants
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm text-gray-700">
                      Générer des variantes aléatoires
                    </span>
                  </label>
                </div>

                <Button className="mt-4">Sauvegarder les paramètres</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card variant="bordered">
      <CardContent>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
