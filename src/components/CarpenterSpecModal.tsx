import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CarpenterSpec } from '@/lib/types';
import { Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CarpenterSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  spec: CarpenterSpec;
  referenceImageUrl?: string;
}

// Helper function to convert remote image URL to blob URL
async function imageUrlToBlobUrl(imageUrl: string): Promise<string> {
  console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Fetching image from:', imageUrl);
  console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Image URL type:', imageUrl.startsWith('http') ? 'HTTP URL' : imageUrl.startsWith('blob:') ? 'Blob URL' : 'Unknown');
  
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Fetch response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} - URL: ${imageUrl}`);
    }
    
    const blob = await response.blob();
    console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Blob created, size:', blob.size, 'type:', blob.type);
    
    const blobUrl = URL.createObjectURL(blob);
    console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Blob URL created:', blobUrl);
    
    return blobUrl;
  } catch (error) {
    console.error('[CarpenterSpecModal] PRODUCTION ERROR - Failed to convert image to blob:', error);
    console.error('[CarpenterSpecModal] PRODUCTION ERROR - Original URL was:', imageUrl);
    throw error;
  }
}

export default function CarpenterSpecModal({
  isOpen,
  onClose,
  itemName,
  spec,
  referenceImageUrl,
}: CarpenterSpecModalProps) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blobUrls, setBlobUrls] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && !pdfBlob) {
      generatePDF();
    }
  }, [isOpen]);

  // Cleanup blob URLs and PDF URL when modal closes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [pdfUrl, blobUrls]);

  const generatePDF = async () => {
    setIsGenerating(true);
    const createdBlobUrls: string[] = [];
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Load the CORRECT Homable brand logo from Supabase
      console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Loading brand logo from Supabase');
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      // Use the new Supabase logo URL
      const logoBlobUrl = await imageUrlToBlobUrl('https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/images/image.png');
      createdBlobUrls.push(logoBlobUrl);
      
      await new Promise((resolve, reject) => {
        logoImg.onload = () => {
          console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Brand logo loaded successfully');
          resolve(null);
        };
        logoImg.onerror = (error) => {
          console.error('[CarpenterSpecModal] PRODUCTION ERROR - Failed to load brand logo:', error);
          reject(error);
        };
        logoImg.src = logoBlobUrl;
      });

      // PAGE 1 - Primary Build Reference
      doc.addImage(logoImg, 'PNG', 15, 15, 25, 25);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('HOMABLE CREATIONS', 45, 30);

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const itemNameUpper = itemName.toUpperCase();
      doc.text(itemNameUpper, 105, 60, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Primary build reference. Follow shape, proportions, and visual details.', 105, 70, { align: 'center' });

      // Main reference image
      if (referenceImageUrl) {
        try {
          console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Converting reference image to blob...');
          console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Reference image URL:', referenceImageUrl);
          const refBlobUrl = await imageUrlToBlobUrl(referenceImageUrl);
          createdBlobUrls.push(refBlobUrl);
          
          console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Loading reference image from blob URL...');
          const refImg = new Image();
          refImg.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            refImg.onload = () => {
              console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Reference image loaded successfully');
              resolve(null);
            };
            refImg.onerror = (error) => {
              console.error('[CarpenterSpecModal] PRODUCTION ERROR - Failed to load reference image:', error);
              reject(error);
            };
            refImg.src = refBlobUrl;
          });

          const maxWidth = 170;
          const maxHeight = 170;
          const imgAspectRatio = refImg.width / refImg.height;
          
          let imgWidth = maxWidth;
          let imgHeight = maxWidth / imgAspectRatio;
          
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = maxHeight * imgAspectRatio;
          }
          
          const xPos = (210 - imgWidth) / 2;
          const yPos = 85;
          
          doc.addImage(refImg, 'JPEG', xPos, yPos, imgWidth, imgHeight);
          console.log('[CarpenterSpecModal] PRODUCTION DEBUG - Reference image added to PDF');
        } catch (error) {
          console.error('[CarpenterSpecModal] PRODUCTION ERROR - Failed to load reference image:', error);
        }
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('www.homablecreations.com', 105, 285, { align: 'center' });

      // PAGE 2 - Build Guidance & Constraints
      doc.addPage();

      doc.addImage(logoImg, 'PNG', 15, 15, 25, 25);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('HOMABLE CREATIONS', 45, 30);

      let yPos = 55;

      // Preferred dimensions
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Preferred dimensions (to guide proportions)', 15, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Width:`, 20, yPos);
      doc.text(`${spec.dimensions.width_cm} cm`, 70, yPos);
      yPos += 6;
      doc.text(`Height:`, 20, yPos);
      doc.text(`${spec.dimensions.height_cm} cm`, 70, yPos);
      yPos += 6;
      doc.text(`Depth:`, 20, yPos);
      doc.text(`${spec.dimensions.depth_cm} cm`, 70, yPos);
      yPos += 6;

      if (spec.dimensions.notes) {
        doc.setFont('helvetica', 'italic');
        const notesLines = doc.splitTextToSize(spec.dimensions.notes, 175);
        doc.text(notesLines, 20, yPos);
        yPos += notesLines.length * 5 + 3;
      }

      // Feasibility & Local Constraints
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Feasibility & Local Constraints', 15, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const constraintText = 'Some finishes, carvings, or spray effects from the reference image may require imported machines or materials and may not be fully replicable locally. Carpenter should propose the closest achievable alternative.';
      const constraintLines = doc.splitTextToSize(constraintText, 175);
      doc.text(constraintLines, 15, yPos);
      yPos += constraintLines.length * 4.5 + 8;

      // Materials
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Materials', 15, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('External Materials', 15, yPos);
      doc.text('Internal Materials', 110, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const leftColX = 15;
      doc.text(`• Wood type: ${spec.material}`, leftColX, yPos);
      doc.text(`• Finish: ${spec.finish}`, leftColX, yPos + 5);
      
      const rightColX = 110;
      doc.text('• Foam: Medium-density foam', rightColX, yPos);
      doc.text('• Seat Support: Plywood base', rightColX, yPos + 5);
      doc.text('• Frame: Hardwood (local)', rightColX, yPos + 10);
      
      yPos += 18;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const materialNote = 'Internal materials affect comfort and durability. Final choice must be agreed before build.';
      const materialNoteLines = doc.splitTextToSize(materialNote, 175);
      doc.text(materialNoteLines, 15, yPos);
      yPos += materialNoteLines.length * 4 + 8;

      // Approval Checkpoints
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Approval Checkpoints', 15, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const checkpoints = [
        'Fabric approval before upholstery',
        'Foam type confirmation',
        'Finish sample approval before spraying'
      ];
      
      checkpoints.forEach((checkpoint) => {
        doc.text(`• ${checkpoint}`, 15, yPos);
        yPos += 5;
      });

      yPos += 3;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Client approval required before production', 15, yPos);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('www.homablecreations.com', 105, 285, { align: 'center' });

      // Create blob and URL
      const blob = doc.output('blob');
      setPdfBlob(blob);
      
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setBlobUrls(createdBlobUrls);
      
      console.log('[CarpenterSpecModal] PRODUCTION DEBUG - PDF generated successfully');
    } catch (error) {
      console.error('[CarpenterSpecModal] PRODUCTION ERROR - Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please check console for details.');
      createdBlobUrls.forEach(url => URL.revokeObjectURL(url));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!pdfBlob) return;

    try {
      const fileName = `homable-carpenter-spec-${itemName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Carpenter Specifications',
        });
      } else {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          alert('PDF downloaded! Please open WhatsApp and attach this file from your downloads.');
        } else {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Failed to share PDF:', error);
      alert('Failed to share PDF. Please try again.');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-[#111111]">
            Carpenter Specifications — {itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-gray-100 rounded-lg p-4 my-4">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C89F7A] mx-auto mb-4"></div>
                <p className="text-[#555555]">Generating PDF preview...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="flex flex-col items-center">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                className="flex flex-col items-center gap-4"
              >
                {Array.from(new Array(numPages), (_, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    className="shadow-lg"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                ))}
              </Document>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 flex-shrink-0">
          <Button
            onClick={handleShare}
            disabled={!pdfBlob || isGenerating}
            className="flex-1 bg-[#C89F7A] hover:bg-[#B5896C] text-white"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}