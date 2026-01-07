import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUploader from '@/components/ImageUploader';
import StylePreviewModal from '@/components/StylePreviewModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { uploadImage, createBoard, validateDecorImage } from '@/lib/api';
import { toast } from 'sonner';
import { AlertCircle, Info, ChevronLeft, ChevronRight, TestTube } from 'lucide-react';
import SpecsCategorySelection from '@/components/specs/SpecsCategorySelection';
import { trackPageView, trackAction, EVENTS } from '@/lib/analytics';
import { getSelectedCountry } from '@/components/LocationSelector';

// Sample images organized by category - REMOVED HOLIDAY LOOKS
const SAMPLE_CATEGORIES = [
  {
    id: 'afro-modern',
    title: 'Afro-Modern Style',
    description: 'African-inspired modern interiors',
    images: [
      { url: '/assets/sample-afro-modern-living-1.jpg', alt: 'Afro-modern living room' },
      { url: '/assets/sample-afro-modern-bedroom-2.jpg', alt: 'Afro-modern bedroom' },
      { url: '/assets/sample-afro-modern-dining-3.jpg', alt: 'Afro-modern dining room' },
    ]
  },
  {
    id: 'everyday-home',
    title: 'Everyday Home Styling',
    description: 'Living rooms, bedrooms, and more',
    images: [
      { url: '/assets/carousel-everyday-living-4.jpg', alt: 'Everyday living room' },
      { url: '/assets/carousel-everyday-bedroom-5.jpg', alt: 'Everyday bedroom' },
      { url: '/assets/carousel-everyday-kitchen-6.jpg', alt: 'Everyday kitchen' },
    ]
  },
  {
    id: 'events',
    title: 'Events',
    description: 'Special occasions and celebrations',
    images: [
      { url: '/assets/event-proposal.jpg', alt: 'Proposal event' },
      { url: '/assets/event-first-birthday.jpg', alt: 'First birthday' },
      { url: '/assets/event-vow-renewal.jpg', alt: 'Vow renewal' },
    ]
  }
];

// High-quality Pinterest-style interior design images organized by room type
const DESIGN_STYLES_BY_ROOM = {
  'Living Room': [
    { name: 'Modern Minimalist', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/0bc0ad2c-3aab-4e33-a9c3-1d4a82cc171a.png' },
    { name: 'Scandinavian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/3bfc32d9-155f-4019-8825-adb4a5d0d493.png' },
    { name: 'Warm Neutral', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/a6b9c91c-283c-4107-963a-4de87b5befe2.png' },
    { name: 'Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/0be708c7-a83d-4e8d-acc1-2c80ff4352c6.png' },
    { name: 'Coastal', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/af9e0e89-a0bc-4817-bd87-7dd6de76d9dd.png' },
    { name: 'Mid-Century Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/82f9bf10-0661-4af9-95cb-e83802840b3c.png' },
    { name: 'Japandi', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/a114b620-d19e-4ccc-a3fd-ca4bd4f54877.png' },
    { name: 'Transitional', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/015b083c-dc01-40b1-a6c2-791294a4d926.png' },
    { name: 'Industrial', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/8c4b873a-99b8-4e72-8575-0de611ff15d3.png' },
    { name: 'French Country', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/fdb0d855-fe6d-425e-b20c-fe5645947eb7.png' },
    { name: 'Modern Farmhouse', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/cb27e325-5835-4a84-925b-ac726ce5bad5.png' },
    { name: 'Bohemian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/5da84903-c08d-4f17-bd73-bb79d274e68f.png' },
    { name: 'Minimalist', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/dbe3cbcb-27c3-4806-b305-375c372020c1.png' },
    { name: 'Warm Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/deeaa83e-e011-4983-af93-1204514ce283.png' },
    { name: 'Nordic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/b72b19d9-3700-47d4-a77c-b8ee2b32298e.png' },
    { name: 'Elegant', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/86607d50-bd70-421a-99fe-271e1ea00190.png' },
    { name: 'Rustic Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/49a151f3-5cc4-4855-a61e-ec1013771504.png' },
    { name: 'Monochrome', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/361c0965-e3eb-4d4f-82e6-dcd65c7a70a4.png' },
    { name: 'Soft Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/52a0b079-4288-41e4-9984-4cad1d652040.png' },
    { name: 'Eclectic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/0a6347e7-3f23-4d01-bc68-e244f84ec95c.png' }
  ],
  'Bedroom': [
    { name: 'Serene White', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/da214c4d-854c-46d9-9740-eb8e7f59c1cc.png' },
    { name: 'Scandinavian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/28e6a8c3-2adc-4ffa-9853-457e860ccace.png' },
    { name: 'Warm Neutral', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/36447990-547b-4691-8499-f162e79b9b93.png' },
    { name: 'Modern Minimalist', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/9b79cd9c-ee8d-4aa8-a369-6bbdaae5b80f.png' },
    { name: 'Coastal', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/30250802-0978-449c-9bea-e174cc9b3b2a.png' },
    { name: 'Japandi', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/9dc82ff4-8af3-4a43-82d9-cfe3ba2f9702.png' },
    { name: 'Bohemian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/32735672-3e25-434e-ae84-d7de47dda841.png' },
    { name: 'French Country', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/ddef2dc4-a4a9-4d96-89ca-840c24defef0.png' },
    { name: 'Modern Farmhouse', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/7b61adda-7de1-4137-8898-cd60b7bfbbfe.png' },
    { name: 'Industrial', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/e17c04fe-e060-4d96-95c5-9767a6bb573b.png' },
    { name: 'Elegant', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/f3a7022f-bad2-492d-b7d2-269e6d5fa4d2.png' },
    { name: 'Nordic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/57d85888-fd50-4a14-881e-d4fb3e0e9bb7.png' },
    { name: 'Monochrome', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/b59dbd0e-7b26-426b-9163-ee99cbc2ae90.png' },
    { name: 'Soft Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/d8e8a4da-e0aa-48ce-9cc4-605cb6dc87dd.png' },
    { name: 'Rustic Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/361d3505-8ccd-4658-b7e5-f1cb4a2f7802.png' },
    { name: 'Transitional', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/706358ae-cae5-4635-89fd-a77bd0299bb1.png' },
    { name: 'Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/7949bc09-b61b-4f76-87b8-df0eb867cbc5.png' },
    { name: 'Warm Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/13f02732-c8ed-4f5f-b2ea-cb4f716de633.png' },
    { name: 'Minimalist', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/107dc508-268c-4080-abf2-552abe75ed35.png' },
    { name: 'Eclectic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/82196246-f799-4509-b62e-23eb55fe5f7f.png' }
  ],
  'Bathroom': [
    { name: 'Modern Spa', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/185facab-af9a-46e1-8c19-414aebdfc432.png' },
    { name: 'Scandinavian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/701e1d46-bc2c-4dec-8ee8-fdbe2f16cd41.png' },
    { name: 'Coastal', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/aa700be9-666a-4ae7-a783-7d5c23a0db09.png' },
    { name: 'Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/59c5f238-92ee-479a-bbe1-39b2ebe459e4.png' },
    { name: 'Industrial', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/c7e9c5f0-25bb-4193-8386-fa25932e8f83.png' },
    { name: 'Modern Farmhouse', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/95e102f8-2f13-4987-91f6-1ed794d9f0fe.png' },
    { name: 'Japandi', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/2fe85fdd-8f02-45cd-acc9-5f16a2253bf1.png' },
    { name: 'French Country', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/91b6edf8-400f-4356-995c-12960ad0820f.png' },
    { name: 'Minimalist', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/dfe1436b-4c76-4a9f-8376-f40e0c296f6d.png' },
    { name: 'Elegant', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/c6671544-2cd6-40ba-8a6e-fc7edf5546d6.png' },
    { name: 'Warm Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/58c8eb55-590f-4e00-aec8-44e0a8f6d1c1.png' },
    { name: 'Nordic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/849cc1b5-e0ba-4b6c-be5c-5c5c30869ec8.png' },
    { name: 'Monochrome', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/3f8722a5-cb4a-441a-8e08-6b434548f3e0.png' },
    { name: 'Transitional', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/a1500e9b-5ed4-4c86-a55a-d35debe32e46.png' },
    { name: 'Rustic Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/d547b3c2-8669-4b57-92cd-bf44caf6e423.png' },
    { name: 'Soft Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/efc74f61-ea28-4083-8360-6c3769009a31.png' },
    { name: 'Bohemian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/30d08693-a9e8-43e0-b1ce-9c154102af8e.png' },
    { name: 'Luxury', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/8689c16c-a7ac-4ece-8106-77774848202f.png' },
    { name: 'Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/a7b57d11-04c8-491e-b978-3dd58d5fcc5c.png' },
    { name: 'Eclectic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/cd97bef1-bafa-4555-92f9-116d5840823c.png' }
  ],
  'Home Office': [
    { name: 'Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/f47e8e63-1c45-4fe2-80e3-f4c0f266df34.png' },
    { name: 'Scandinavian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/078af57e-22a8-44d6-968d-71150f6c1b6f.png' },
    { name: 'Minimalist', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/11832a0e-52db-4e3d-83e2-c9f398c5bfa6.png' },
    { name: 'Industrial', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/cacead4d-8132-429e-8cbd-e839870f3285.png' },
    { name: 'Modern Farmhouse', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/32f33ca4-8c11-43a6-9eb9-2a9ba10f28a5.png' },
    { name: 'Japandi', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/e04ac488-b4d3-4177-9f7d-1c2c4bbb0aa2.png' },
    { name: 'Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/dd9d045d-fcac-4bf2-b1b5-0d0f85dd394e.png' },
    { name: 'Coastal', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/16cd4676-c36b-4ee0-8b81-cb6a2525bf86.png' },
    { name: 'Bohemian', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/5ce1d294-5806-4221-a9e0-251e2013a3a4.png' },
    { name: 'French Country', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/5261f812-0f91-45f6-bb5d-2fe45984af56.png' },
    { name: 'Warm Contemporary', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/7f7756a2-c7ea-4c55-881f-2fd077ac0986.png' },
    { name: 'Nordic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/18fbad67-0c73-4e66-819c-009c51fd3aca.png' },
    { name: 'Monochrome', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/8ae87968-b925-432e-b32a-a8e38460d084.png' },
    { name: 'Elegant', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/db562ced-372b-410b-85ba-5bd0dd29d803.png' },
    { name: 'Rustic Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/15ebcd33-445d-4c6a-befe-eb2dbdb76d8b.png' },
    { name: 'Transitional', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/fe5a1dc9-2af5-49dc-9314-f985527a9bf9.png' },
    { name: 'Soft Modern', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/c2a4bbb3-582e-49a9-8a63-a0befcf9bbf5.png' },
    { name: 'Creative', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/e6514221-cb85-4866-a6e8-0cbc6eab6a20.png' },
    { name: 'Luxury', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/1324f80b-deb4-4b53-a8d8-4c110992f53c.png' },
    { name: 'Eclectic', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/7cbbadfe-2d8e-427b-bfa8-97002d3fff8b.png' }
  ],
  'Events': [
    { name: 'Wedding Reception', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/72501db5-2888-4eb3-83bf-4dea431e69e2.png' },
    { name: 'Birthday Party', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/8f6f5826-6630-483e-bf7b-1788cf093940.png' },
    { name: 'Garden Wedding', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/e261769a-c225-4bd7-bcff-7157c05435fb.png' },
    { name: 'Baby Shower', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/af550409-852e-4604-872b-431f91abbc89.png' },
    { name: 'Engagement Party', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/54d5ede6-282d-44e6-97f0-561e183efb75.png' },
    { name: 'Corporate Cocktail', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/4916ce02-3079-42a8-a2c6-b95849f9607c.png' },
    { name: 'Dinner Party', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/8de6e124-0aaf-4747-ac04-551b90e71bac.png' },
    { name: 'Graduation', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/e61da3c6-a9c5-4be5-befe-a2d78b457829.png' },
    { name: 'Bridal Shower', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/933211a0-7c55-4b87-a1cf-bf893e5e5c63.png' },
    { name: 'Anniversary Dinner', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/5bd1054e-bf58-406b-b1cc-26b35ff6c41a.png' },
    { name: 'Kids Birthday', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/6cfc1754-5669-4a02-8580-026652c4f542.png' },
    { name: 'Summer Barbecue', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/a703e350-29f5-4fd5-a9ea-f56f97221826.png' },
    { name: 'Cocktail Party', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/3f6d6aaf-8b86-4a54-919c-0a9caea1e605.png' },
    { name: 'Retirement', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/98b830bf-128c-4655-99b8-c8625da04b87.png' },
    { name: 'Baptism', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/272d503d-4647-4788-b1a2-4210d6e31d41.png' },
    { name: 'Holiday Dinner', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/c20ea421-570c-4744-a424-3bd9e68b6abd.png' },
    { name: 'Milestone Birthday', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/a43e9586-df1d-4659-aa0b-078c9463fcf7.png' },
    { name: 'Garden Party', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/8119a534-1917-48f7-bba2-5d549a8ee02a.png' },
    { name: 'Quinceañera', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/88a47621-a451-4578-99d7-a3b4cfa77a2c.png' },
    { name: 'Vow Renewal', image: 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/38ad8d8d-eec1-450c-b092-267099e5d18c.png' }
  ]
};

type TabType = 'explore' | 'inspiration' | 'specs';
type RoomFilter = 'All' | 'Living Room' | 'Bedroom' | 'Bathroom' | 'Home Office' | 'Events';

const ITEMS_PER_PAGE = 10;

export default function Upload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSampleImage, setIsSampleImage] = useState(false);
  const [sampleImageAlt, setSampleImageAlt] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('inspiration');
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal state for style preview
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStyleImage, setSelectedStyleImage] = useState<string>('');
  const [selectedStyleName, setSelectedStyleName] = useState<string>('');

  // Test country parameter for testing from different locations
  const testCountry = searchParams.get('test_country');

  // Track homepage view on mount
  useEffect(() => {
    trackPageView(EVENTS.HOMEPAGE_VIEWED);
  }, []);

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const mode = searchParams.get('mode');
    
    // Map mode parameter to tab
    if (mode === 'explore' || mode === 'design') {
      setActiveTab('explore');
    } else if (mode === 'replicate' || mode === 'inspiration') {
      setActiveTab('inspiration');
    } else if (mode === 'find') {
      setActiveTab('specs');
    }
  }, [searchParams]);

  // Reset to page 1 when room filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [roomFilter]);

  const handleImageSelect = (file: File) => {
    console.log('Image selected:', file.name, file.type, file.size);
    setSelectedFile(file);
    setValidationError(null);
    setIsSampleImage(false);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Track upload started
    trackAction(EVENTS.UPLOAD_STARTED, { 
      file_size: file.size,
      file_type: file.type 
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
    setValidationError(null);
    setIsSampleImage(false);
    setSampleImageAlt('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const handleTryAgain = () => {
    handleClear();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    console.log('Starting upload process for:', selectedFile.name);
    setUploading(true);
    setValidationError(null);

    // Track image analysis started
    trackAction(EVENTS.IMAGE_ANALYSIS_STARTED, {
      is_sample_image: isSampleImage
    });

    try {
      // Upload image to Supabase storage
      console.log('Uploading image to Supabase storage...');
      const imageUrl = await uploadImage(selectedFile);
      console.log('Image uploaded successfully:', imageUrl);
      
      // Validate that the image contains decor/furniture
      // If validation fails (network error, CORS, etc.), treat as valid and continue
      let validation;
      try {
        console.log('Validating image content...');
        validation = await validateDecorImage(imageUrl);
        console.log('Validation result:', validation);
      } catch (validationError) {
        console.error('Validation error (treating as valid):', validationError);
        // Log to help debug but don't block the user
        console.log('Validation failed, allowing image to proceed to analysis');
        validation = { is_valid: true, confidence: 0.5, reason: 'Validation error, allowing by default' };
      }
      
      // Check if image is valid (very permissive - only block if explicitly invalid)
      if (validation.is_valid === false) {
        setValidationError(
          "We couldn't detect decor in this image. Please upload a photo that clearly shows interior decor, furniture or home styling."
        );
        setUploading(false);
        return;
      }
      
      // Get selected country from LocationSelector
      const selectedCountry = getSelectedCountry();
      console.log('[Upload] Using selected country:', selectedCountry);
      
      // Create board with appropriate name and selected country (or test_country if present)
      const boardName = isSampleImage ? sampleImageAlt : 'Untitled inspiration';
      console.log('Creating board...');
      const board = await createBoard(boardName, imageUrl, testCountry || selectedCountry);
      console.log('Board created successfully:', board.id);
      
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Navigate to analyzing page
      console.log('Navigating to analyzing page...');
      navigate(`/analyzing/${board.id}`);
    } catch (error) {
      console.error('Upload error details:', error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Upload failed: ${errorMessage}`);
      setUploading(false);
    }
  };

  const handleSampleImageClick = async (imageUrl: string, altText: string) => {
    console.log('Sample image clicked:', imageUrl);
    
    // Track upload clicked
    trackAction(EVENTS.UPLOAD_CLICKED, {
      source: 'sample_image',
      image_alt: altText
    });

    try {
      // Fetch the sample image and convert to blob
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to load sample image');
      }
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], `sample-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Set as selected file and show in preview box
      setSelectedFile(file);
      setIsSampleImage(true);
      setSampleImageAlt(altText);
      setPreviewUrl(imageUrl); // Use the sample image URL directly for preview
      setValidationError(null);
      
      // Scroll to the preview box
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      console.log('Sample image loaded into preview box');
    } catch (error) {
      console.error('Sample image error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sample image';
      toast.error(errorMessage);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === 'explore') {
      newSearchParams.set('mode', 'explore');
    } else if (tab === 'inspiration') {
      newSearchParams.set('mode', 'inspiration');
    } else if (tab === 'specs') {
      newSearchParams.set('mode', 'find');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
  };

  const handleStyleClick = (styleName: string, styleImage: string) => {
    // Open modal instead of directly loading image
    setSelectedStyleImage(styleImage);
    setSelectedStyleName(styleName);
    setIsModalOpen(true);
    
    // Track style clicked
    trackAction(EVENTS.UPLOAD_CLICKED, {
      source: 'explore_styles',
      style_name: styleName
    });
  };

  const handleModalAnalyze = async () => {
    // Close modal first
    setIsModalOpen(false);
    
    // Set uploading state
    setUploading(true);
    
    console.log('Modal analyze clicked for style:', selectedStyleName);
    
    // Track upload clicked
    trackAction(EVENTS.UPLOAD_CLICKED, {
      source: 'explore_styles_modal',
      style_name: selectedStyleName
    });

    try {
      // FIXED: Skip fetch and directly use the CDN URL
      // The CDN images are already hosted and accessible, no need to re-upload
      console.log('Using CDN image URL directly:', selectedStyleImage);
      
      // Track image analysis started
      trackAction(EVENTS.IMAGE_ANALYSIS_STARTED, {
        is_sample_image: true,
        source: 'explore_styles'
      });
      
      // Validate that the image contains decor/furniture
      let validation;
      try {
        console.log('Validating image content...');
        validation = await validateDecorImage(selectedStyleImage);
        console.log('Validation result:', validation);
      } catch (validationError) {
        console.error('Validation error (treating as valid):', validationError);
        validation = { is_valid: true, confidence: 0.5, reason: 'Validation error, allowing by default' };
      }
      
      // Check if image is valid
      if (validation.is_valid === false) {
        toast.error("We couldn't detect decor in this image.");
        setUploading(false);
        return;
      }
      
      // Get selected country from LocationSelector
      const selectedCountry = getSelectedCountry();
      console.log('[Upload] Using selected country:', selectedCountry);
      
      // Create board with style name and selected country (or test_country if present)
      console.log('Creating board...');
      const board = await createBoard(selectedStyleName, selectedStyleImage, testCountry || selectedCountry);
      console.log('Board created successfully:', board.id);
      
      // Navigate to analyzing page
      console.log('Navigating to analyzing page...');
      navigate(`/analyzing/${board.id}`);
    } catch (error) {
      console.error('Style analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze style';
      toast.error(`Analysis failed: ${errorMessage}`);
      setUploading(false);
    }
  };

  // Get filtered styles based on room filter
  const getFilteredStyles = () => {
    if (roomFilter === 'All') {
      // Return all styles from all rooms
      return Object.entries(DESIGN_STYLES_BY_ROOM).flatMap(([roomType, styles]) => 
        styles.map(style => ({ ...style, roomType }))
      );
    }
    // Return styles for selected room type
    return (DESIGN_STYLES_BY_ROOM[roomFilter] || []).map(style => ({ ...style, roomType: roomFilter }));
  };

  const filteredStyles = getFilteredStyles();
  
  // Pagination
  const totalPages = Math.ceil(filteredStyles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentStyles = filteredStyles.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Testing Mode Banner */}
          {testCountry && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-start gap-3">
                <TestTube className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">
                    Testing Mode Active
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Simulating country: <span className="font-mono font-bold">{testCountry}</span>
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    To disable, remove <code className="bg-purple-100 px-1 rounded">?test_country={testCountry}</code> from the URL
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Static Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">
              Bring Your Design Ideas to Life
            </h1>
            <p className="text-lg text-[#555555]">
              Start from inspiration or from real-world constraints. Homable helps you turn ideas into an actionable plan.
            </p>
          </div>

          {/* Three-Tab Selector - FIXED FOR MOBILE */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white rounded-full p-1 shadow-md border border-gray-200">
              <button
                onClick={() => handleTabChange('explore')}
                className={`px-3 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'explore'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Explore styles
              </button>
              <button
                onClick={() => handleTabChange('inspiration')}
                className={`px-3 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'inspiration'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Start with inspiration
              </button>
              <button
                onClick={() => handleTabChange('specs')}
                className={`px-3 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'specs'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Start with what fits
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {/* Explore Styles Tab */}
          {activeTab === 'explore' && (
            <div className="space-y-8">
              {/* Info Banner */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    Browse curated room styles to find inspiration. Click any room to see what decor items create that look.
                  </p>
                </div>
              </div>

              {/* Room Type Filter */}
              <div className="flex flex-wrap gap-2 justify-center">
                {(['All', 'Living Room', 'Bedroom', 'Bathroom', 'Home Office', 'Events'] as RoomFilter[]).map((room) => (
                  <button
                    key={room}
                    onClick={() => setRoomFilter(room)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      roomFilter === room
                        ? 'bg-[#111111] text-white'
                        : 'bg-white text-[#555555] hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {room}
                  </button>
                ))}
              </div>

              {/* Style Grid */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#111111]">
                    {roomFilter === 'All' ? 'All Design Styles' : `${roomFilter} Styles`}
                  </h2>
                  <p className="text-sm text-[#555555]">
                    {filteredStyles.length} styles • Page {currentPage} of {totalPages}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {currentStyles.map((style, index) => (
                    <Card
                      key={`${style.roomType}-${style.name}-${index}`}
                      className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl border-0"
                      onClick={() => !uploading && handleStyleClick(style.name, style.image)}
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={style.image}
                          alt={style.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-base text-[#111111]">
                          {style.name}
                        </h3>
                        <p className="text-xs text-[#555555] mt-1">
                          {style.roomType}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination Controls - FIXED FOR MOBILE */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                    <Button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </Button>
                    
                    <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-10 h-10 flex-shrink-0 rounded-full text-sm font-medium transition-all ${
                            currentPage === page
                              ? 'bg-[#111111] text-white'
                              : 'bg-white text-[#555555] hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start with Inspiration Tab */}
          {activeTab === 'inspiration' && (
            <>
              <div className="bg-white rounded-3xl p-8 shadow-lg">
                {/* Info Banner - Positioned above the upload box */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Homable works best with home and event decor photos.</span> Non-decor images may not be analyzed.
                    </p>
                  </div>
                </div>

                <ImageUploader 
                  onImageSelect={handleImageSelect}
                  previewUrl={previewUrl}
                  onClear={handleClear}
                />

                {validationError && (
                  <div className="mt-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 mb-2">
                          {validationError}
                        </p>
                        <p className="text-xs text-amber-700">
                          Try uploading a photo that shows furniture, a room, or home decor items.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleTryAgain}
                      variant="outline"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      Try Another Inspiration Photo
                    </Button>
                  </div>
                )}

                {selectedFile && !validationError && (
                  <div className="mt-8">
                    <Button
                      size="lg"
                      onClick={handleAnalyze}
                      disabled={uploading}
                      className="w-full bg-[#111111] hover:bg-[#333333] text-white text-lg py-6 rounded-full"
                    >
                      {uploading ? 'Validating...' : 'Analyze My Inspiration'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Sample Images Section */}
              <div className="mt-16">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 text-[#111111]">
                    Don't Have a Photo? Try One of Our Favourites!
                  </h2>
                  <p className="text-base text-[#555555]">
                    Choose one of these looks to see how Homable works.
                  </p>
                </div>

                {/* Categories */}
                <div className="space-y-12">
                  {SAMPLE_CATEGORIES.map((category) => (
                    <div key={category.id}>
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-[#111111] mb-1">
                          {category.title}
                        </h3>
                        <p className="text-sm text-[#555555]">
                          {category.description}
                        </p>
                      </div>
                      
                      {/* Responsive Grid: 2 cols mobile, 3 cols tablet/desktop */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {category.images.map((image, index) => (
                          <Card
                            key={index}
                            className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl border-0"
                            onClick={() => !uploading && handleSampleImageClick(image.url, image.alt)}
                          >
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={image.url}
                                alt={image.alt}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Start with Specs Tab */}
          {activeTab === 'specs' && (
            <SpecsCategorySelection />
          )}
        </div>
      </main>

      <Footer />

      {/* Style Preview Modal */}
      <StylePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={selectedStyleImage}
        styleName={selectedStyleName}
        onAnalyze={handleModalAnalyze}
        isAnalyzing={uploading}
      />
    </div>
  );
}