import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserChecklists } from '@/lib/api';
import { ChecklistWithItems } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ClipboardList, Plus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Checklists() {
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<ChecklistWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserChecklists();
      setChecklists(data);
    } catch (err: unknown) {
      console.error('Failed to load shopping lists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shopping lists');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadChecklists}>Try Again</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#111111]">My Shopping Lists</h1>
            {checklists.length > 0 && (
              <Button
                onClick={() => navigate('/my-boards')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create from History</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
          </div>
          <p className="text-gray-600">
            Track your shopping progress for detected items
          </p>
        </div>

        {/* Checklists Grid */}
        {checklists.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <ClipboardList className="h-20 w-20 text-[#C89F7A]" strokeWidth={1.5} />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">✓</span>
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[#111111] mb-3">
                Start your first decor shopping list
              </h3>
              <p className="text-gray-600 text-center mb-8 max-w-lg leading-relaxed">
                After analyzing an image, save your results as a shopping list so you always know what you've bought and what's still on your wish list.
              </p>
              <Button
                onClick={() => navigate('/upload')}
                className="bg-black text-white hover:bg-black/90 rounded-full px-8"
                size="lg"
              >
                Upload an Image
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {checklists.map((checklist) => {
              const progressPercent = checklist.total_count > 0
                ? Math.round((checklist.completed_count / checklist.total_count) * 100)
                : 0;

              return (
                <Card
                  key={checklist.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/checklists/${checklist.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-[#111111] line-clamp-2">
                      {checklist.name}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(checklist.created_at)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {checklist.completed_count} of {checklist.total_count} items
                          </span>
                          <span className="text-sm font-bold text-[#2F9E44]">
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2 [&>div]:bg-[#2F9E44]" />
                      </div>

                      {/* Status Badge */}
                      {checklist.completed_count === checklist.total_count && checklist.total_count > 0 && (
                        <div className="flex items-center gap-2 text-[#2F9E44] text-sm font-medium">
                          <div className="h-2 w-2 rounded-full bg-[#2F9E44]" />
                          Completed
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}