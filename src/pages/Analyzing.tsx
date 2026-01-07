import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyzeImage, updateBoardName, generateBoardName } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function Analyzing() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Our AI is identifying decor items and styles...');
  const [boardImageUrl, setBoardImageUrl] = useState<string | null>(null);

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
        
        // Check if board has test country set
        if (board.country) {
          console.log('Board has test country set:', board.country);
        }
        
        // Set the board image URL for preview
        const imageUrl = board.source_image_url || board.cover_image_url;
        setBoardImageUrl(imageUrl);

        // Run AI analysis (no auth check here - let the edge function handle it)
        console.log('Calling analyzeImage...');
        const result = await analyzeImage(boardId, imageUrl);
        console.log('Analysis completed successfully, result:', result);

        // Extract detected items from the result object
        const detectedItems = result.detected_items || [];
        console.log('Detected items:', detectedItems);

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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-stone-50">
      <div className="text-center space-y-8 max-w-md px-4">
        {/* Preview Image */}
        {boardImageUrl && (
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={boardImageUrl}
                alt="Your inspiration"
                className="w-56 h-56 md:w-72 md:h-72 object-cover rounded-3xl shadow-2xl border-4 border-white"
              />
            </div>
          </div>
        )}

        {/* Minimal Bar Loader */}
        <div className="w-full max-w-xs mx-auto">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gray-800 to-gray-600 rounded-full animate-[slide_1.5s_ease-in-out_infinite]"
              style={{
                width: '40%',
              }}
            ></div>
          </div>
        </div>

        <div className="space-y-3">
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

        {elapsedTime > 0 && (
          <p className="text-xs text-gray-400">
            {elapsedTime}s elapsed
          </p>
        )}
      </div>

      <style>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(350%);
          }
        }
      `}</style>
    </div>
  );
}