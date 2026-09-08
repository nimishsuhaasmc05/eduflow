// High-quality education and computer science photography presets (Unsplash CDN)

export interface ImagePreset {
  id: string;
  title: string;
  category: string;
  url: string;
}

export const EDUCATION_IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'ai-ml',
    title: 'AI & Neural Networks',
    category: 'Computer Science',
    url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'computer-vision',
    title: 'Computer Vision & Deep Learning',
    category: 'Computer Science',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'students-laptops',
    title: 'Students Collaborating on Laptops',
    category: 'Education',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'data-science',
    title: 'Data Analytics & Statistics',
    category: 'Data Science',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'coding-python',
    title: 'Python & Web Development',
    category: 'Programming',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'robotics',
    title: 'Autonomous Systems & Robotics',
    category: 'Engineering',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'classroom-learning',
    title: 'Modern Interactive Classroom',
    category: 'Education',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
  }
];

export const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';

export function getEducationImageUrl(providedUrl?: string | null, category?: string): string {
  if (providedUrl && providedUrl.trim().length > 10 && !providedUrl.includes('placeholder')) {
    return providedUrl;
  }
  const match = EDUCATION_IMAGE_PRESETS.find(
    (p) => p.category.toLowerCase() === (category || '').toLowerCase()
  );
  return match ? match.url : DEFAULT_FALLBACK_IMAGE;
}
