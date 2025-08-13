/*
  # Add sample AI apps

  1. Changes
    - Insert sample AI apps into app_listings table
    - Add realistic data for testing and development
*/

INSERT INTO app_listings (
  name,
  description,
  short_description,
  developer_name,
  original_store,
  store_url,
  price,
  category,
  tags,
  rating,
  reviews_count,
  reviews,
  icon_url,
  screenshots,
  features,
  is_available
) VALUES
(
  'AImagine Pro',
  'AImagine Pro is a revolutionary AI-powered image generation and editing tool. Create stunning artwork, edit photos with AI precision, and transform your creative ideas into reality with our advanced machine learning algorithms.

  Our state-of-the-art AI models understand natural language descriptions and convert them into beautiful, high-quality images. Whether you''re a professional artist or just getting started, AImagine Pro provides the tools you need to bring your vision to life.',
  'Create stunning artwork and edit photos with advanced AI',
  'AImagine Labs',
  'Google Play',
  'https://play.google.com/store/apps/details?id=com.aimagine.pro',
  9.99,
  'creativity',
  ARRAY['image generation', 'ai art', 'photo editing'],
  4.8,
  1250,
  '[
    {"id": "r1", "rating": 5, "comment": "Best AI art generator I''ve used! The results are incredibly detailed and the UI is intuitive.", "userName": "Sarah Chen", "source": "Google Play", "date": "2025-02-10"},
    {"id": "r2", "rating": 5, "comment": "Amazing tool for both professional and personal use. Worth every penny!", "userName": "Michael Rodriguez", "source": "Google Play", "date": "2025-02-08"},
    {"id": "r3", "rating": 4, "comment": "Great app, but would love to see more style options.", "userName": "Emma Watson", "source": "Google Play", "date": "2025-02-05"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1547954575-855750c57bd3',
  ARRAY[
    'https://images.unsplash.com/photo-1580927752452-89d86da3fa0a',
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634',
    'https://images.unsplash.com/photo-1483546416237-76fd26bbcdd1'
  ],
  ARRAY[
    'Natural language image generation',
    'Advanced photo editing with AI',
    'Style transfer and art filters',
    'Batch processing capabilities',
    'Cloud storage integration'
  ],
  true
),
(
  'CodePilot AI',
  'CodePilot AI is your intelligent coding companion that helps you write better code faster. Powered by advanced language models, it provides smart code completions, refactoring suggestions, and real-time code analysis across multiple programming languages.

  Features include intelligent code completion, bug detection, automated testing suggestions, and integration with popular IDEs. Perfect for both beginners and experienced developers.',
  'Your AI-powered coding companion',
  'TechMind Solutions',
  'App Store',
  'https://apps.apple.com/us/app/codepilot-ai',
  19.99,
  'developer',
  ARRAY['programming', 'code completion', 'developer tools'],
  4.9,
  3420,
  '[
    {"id": "r1", "rating": 5, "comment": "This has completely transformed my coding workflow. The suggestions are incredibly accurate.", "userName": "David Kim", "source": "App Store", "date": "2025-02-12"},
    {"id": "r2", "rating": 5, "comment": "Essential tool for any developer. Saves hours of coding time!", "userName": "Lisa Johnson", "source": "App Store", "date": "2025-02-09"},
    {"id": "r3", "rating": 4, "comment": "Great features but could use better documentation.", "userName": "Alex Thompson", "source": "App Store", "date": "2025-02-07"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713',
  ARRAY[
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6',
    'https://images.unsplash.com/photo-1566837945700-30057527ade0',
    'https://images.unsplash.com/photo-1527427337751-fdca2f128ce5'
  ],
  ARRAY[
    'Multi-language support',
    'Real-time code analysis',
    'Automated testing suggestions',
    'Git integration',
    'Custom snippet library'
  ],
  true
),
(
  'SmartWrite AI',
  'SmartWrite AI is a comprehensive writing assistant that helps you create better content faster. From email compositions to creative writing, our AI helps you write with confidence and style.

  The app features advanced grammar checking, style suggestions, tone analysis, and even helps with writer''s block by providing creative prompts and continuations.',
  'AI-powered writing assistant for better content',
  'Scribble Intelligence',
  'Microsoft Store',
  'https://apps.microsoft.com/store/detail/smartwrite-ai',
  4.99,
  'productivity',
  ARRAY['writing', 'grammar', 'productivity'],
  4.7,
  2840,
  '[
    {"id": "r1", "rating": 5, "comment": "This app has improved my writing significantly. The suggestions are always on point.", "userName": "James Wilson", "source": "Microsoft Store", "date": "2025-02-11"},
    {"id": "r2", "rating": 4, "comment": "Very helpful for business writing. Could use more templates.", "userName": "Maria Garcia", "source": "Microsoft Store", "date": "2025-02-10"},
    {"id": "r3", "rating": 5, "comment": "Perfect for content creators! Love the tone analysis feature.", "userName": "Chris Taylor", "source": "Microsoft Store", "date": "2025-02-08"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1455390582262-044cdead277a',
  ARRAY[
    'https://images.unsplash.com/photo-1455390582262-044cdead277a',
    'https://images.unsplash.com/photo-1456324504439-367cee3b3c32',
    'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e'
  ],
  ARRAY[
    'Advanced grammar checking',
    'Style and tone analysis',
    'Creative writing assistance',
    'Multiple language support',
    'Document templates'
  ],
  true
),
(
  'VoiceGenius Pro',
  'VoiceGenius Pro is an advanced AI voice assistant that goes beyond basic commands. With natural language processing and contextual understanding, it helps you manage your daily tasks, schedule, and communications more efficiently.

  Currently in development and not yet available for installation.',
  'Advanced AI voice assistant with natural language understanding',
  'VoiceAI Technologies',
  'Coming Soon',
  '#',
  0.00,
  'productivity',
  ARRAY['voice assistant', 'ai', 'productivity'],
  0.0,
  0,
  '[]'::jsonb,
  'https://images.unsplash.com/photo-1589254065878-42c9da997008',
  ARRAY[
    'https://images.unsplash.com/photo-1589254065878-42c9da997008',
    'https://images.unsplash.com/photo-1589254066213-a0c9dc853511'
  ],
  ARRAY[
    'Natural language understanding',
    'Contextual awareness',
    'Multi-device sync',
    'Offline capabilities',
    'Custom voice commands'
  ],
  false
);