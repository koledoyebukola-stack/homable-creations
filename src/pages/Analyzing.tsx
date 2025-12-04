import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { analyzeImage, updateBoardName, generateBoardName } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function Analyzing() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Our AI is identifying decor items and styles...');

  useEffect(() => {
    // Timer to track elapsed time and update progress messages
    const timer = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1;
        
        // Update progress messages based on elapsed time
        if (newTime >= 10) {
          setProgressMessage('Almost there! Finalizing your matches...');
        } else if (newTime >= 7) {
          setProgressMessage('Finding the best product matches...');
        } else if (newTime >= 4) {
          setProgressMessage('Analyzing styles and colors...');
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const runAnalysis = async () => {
      if (!boardId) {
        console.error('No board ID provided');
        setError('Invalid board ID');
        return;
      }

      try {
        console.log('Starting analysis for board:', boardId);

        // Get board details
        const { data: board, error: boardError } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .single();

        if (boardError) {
          console.error('Failed to fetch board:', boardError);
          throw new Error('Failed to fetch board details');
        }

        console.log('Board fetched:', board);

        // Run AI analysis
        console.log('Calling analyzeImage...');
        const detectedItems = await analyzeImage(boardId, board.source_image_url || board.cover_image_url);
        console.log('Analysis completed successfully, detected items:', detectedItems);

        // Generate smart board name based on detected items
        const smartName = generateBoardName(detectedItems);
        console.log('Generated smart board name:', smartName);
        
        // Update board name and WAIT for it to complete before navigating
        try {
          await updateBoardName(boardId, smartName);
          console.log('Board name updated successfully in database');
        } catch (nameError) {
          console.error('Failed to update board name:', nameError);
          // Continue anyway - don't block navigation
        }

        // Navigate to results page after name is updated
        console.log('Redirecting to item detection page');
        navigate(`/item-detection/${boardId}`);
      } catch (err) {
        console.error('Analysis error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
        setError(errorMessage);

        // Wait 3 seconds then redirect to results page anyway
        setTimeout(() => {
          console.log('Redirecting to item detection after error');
          navigate(`/item-detection/${boardId}`);
        }, 3000);
      }
    };

    runAnalysis();
  }, [boardId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-stone-50">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="p-4 rounded-full bg-red-100 inline-block">
            <svg
              className="h-12 w-12 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Analysis Error
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Redirecting you to continue...
            </p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-stone-50">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full bg-blue-100 animate-pulse"></div>
          </div>
          <div className="relative flex items-center justify-center h-32">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">
            Analyzing Your Inspiration
          </h2>
          <p className="text-lg text-gray-600">
            {progressMessage}
          </p>
          {elapsedTime >= 10 && (
            <p className="text-sm text-gray-500 mt-2">
              This is taking a bit longer than usual, but we're still working on it...
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce"></div>
          <div
            className="h-2 w-2 rounded-full bg-blue-600 animate-bounce"
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className="h-2 w-2 rounded-full bg-blue-600 animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
        </div>

        {elapsedTime > 0 && (
          <p className="text-xs text-gray-400">
            {elapsedTime}s elapsed
          </p>
        )}
      </div>
    </div>
  );
}