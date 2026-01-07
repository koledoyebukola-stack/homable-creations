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

  useEffect(() => {
    if (isOpen && !pdfBlob) {
      generatePDF();
    }
  }, [isOpen]);

  // Cleanup PDF URL when modal closes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Load Homable logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/assets/homable-logo.png';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });

      // PAGE 1 - Primary Build Reference (Visual-First)
      // Header with logo and brand name
      doc.addImage(logoImg, 'PNG', 15, 15, 25, 25);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('HOMABLE CREATIONS', 45, 30);

      // Item name (large, bold, uppercase) - centered
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const itemNameUpper = itemName.toUpperCase();
      doc.text(itemNameUpper, 105, 60, { align: 'center' });

      // Critical instructional line
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Primary build reference. Follow shape, proportions, and visual details.', 105, 70, { align: 'center' });

      // Main reference image (large, centered)
      if (referenceImageUrl) {
        try {
          const refImg = new Image();
          refImg.crossOrigin = 'anonymous';
          refImg.src = referenceImageUrl;
          
          await new Promise((resolve, reject) => {
            refImg.onload = resolve;
            refImg.onerror = reject;
          });

          // Calculate dimensions to fit image (max 170mm width, max 170mm height)
          const maxWidth = 170;
          const maxHeight = 170;
          const imgAspectRatio = refImg.width / refImg.height;
          
          let imgWidth = maxWidth;
          let imgHeight = maxWidth / imgAspectRatio;
          
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = maxHeight * imgAspectRatio;
          }
          
          const xPos = (210 - imgWidth) / 2; // Center horizontally
          const yPos = 85;
          
          doc.addImage(refImg, 'JPEG', xPos, yPos, imgWidth, imgHeight);
        } catch (error) {
          console.error('Failed to load reference image:', error);
        }
      }

      // Footer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('www.homablecreations.com', 105, 285, { align: 'center' });

      // PAGE 2 - Build Guidance & Constraints
      doc.addPage();

      // Header
      doc.addImage(logoImg, 'PNG', 15, 15, 25, 25);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('HOMABLE CREATIONS', 45, 30);

      let yPos = 55;

      // Section 1: Preferred dimensions (guidance, not strict)
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

      // Section 2: Feasibility & Local Constraints
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

      // Section 3: Materials (two columns)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Materials', 15, yPos);
      yPos += 8;

      // Column headers
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('External Materials', 15, yPos);
      doc.text('Internal Materials', 110, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // External materials (left column)
      const leftColX = 15;
      doc.text(`• Wood type: ${spec.material}`, leftColX, yPos);
      doc.text(`• Finish: ${spec.finish}`, leftColX, yPos + 5);
      
      // Internal materials (right column)
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

      // Section 4: Approval Checkpoints
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Approval Checkpoints', 15, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Standard approval checkpoints
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

      // Footer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('www.homablecreations.com', 105, 285, { align: 'center' });

      // Create blob instead of downloading
      const blob = doc.output('blob');
      setPdfBlob(blob);
      
      // Create object URL for preview
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!pdfBlob) return;

    try {
      const fileName = `homable-carpenter-spec-${itemName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Carpenter Specifications',
        });
      } else {
        // Fallback: Create WhatsApp URL (mobile only)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          // On mobile, we can't directly share files via WhatsApp URL
          // So we'll trigger a download and show instructions
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
          // Desktop fallback: just download
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

        {/* PDF Preview */}
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

        {/* Action Buttons */}
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