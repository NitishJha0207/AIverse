import React, { useState, useEffect, useRef } from 'react';
import { Search, Brain, Star, ExternalLink, Code, MessageSquare, Zap, Filter, ChevronDown, X, Calendar, Book, Command, Sparkles } from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: string;
  capabilities: string[];
  useCases: string[];
  apiUrl: string;
  documentationUrl: string;
  pricing: string;
  releaseDate: string;
  tags: string[];
  rating: number;
}

const aiModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'GPT-4 is OpenAI\'s most advanced system, producing safer and more useful responses. It exhibits human-level performance on various academic and professional tests.',
    category: 'Language Models',
    capabilities: [
      'Natural language understanding and generation',
      'Code generation and analysis',
      'Complex problem solving',
      'Multi-modal inputs (text and images)',
      'Creative writing and content generation'
    ],
    useCases: [
      'Content creation',
      'Programming assistance',
      'Education and tutoring',
      'Research and analysis',
      'Customer service'
    ],
    apiUrl: 'https://platform.openai.com/docs/api-reference',
    documentationUrl: 'https://platform.openai.com/docs/guides/gpt-4',
    pricing: 'Starting at $0.03/1K tokens',
    releaseDate: '2024-03-14',
    tags: ['GPT', 'Language Model', 'AI', 'NLP'],
    rating: 4.9
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    provider: 'Anthropic',
    description: 'Claude 3 is Anthropic\'s latest AI model, offering enhanced capabilities in reasoning, analysis, and creative tasks with a focus on safety and reliability.',
    category: 'Language Models',
    capabilities: [
      'Advanced reasoning and analysis',
      'Long context understanding',
      'Code generation and review',
      'Research and writing assistance',
      'Task automation'
    ],
    useCases: [
      'Academic research',
      'Business analysis',
      'Content creation',
      'Software development',
      'Data analysis'
    ],
    apiUrl: 'https://www.anthropic.com/api',
    documentationUrl: 'https://docs.anthropic.com/claude',
    pricing: 'Contact for pricing',
    releaseDate: '2024-03-04',
    tags: ['Claude', 'Language Model', 'AI', 'Research'],
    rating: 4.8
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Gemini Pro is Google\'s most capable AI model, designed to handle text, code, images, and audio with state-of-the-art performance across a wide range of tasks.',
    category: 'Multimodal Models',
    capabilities: [
      'Multimodal understanding',
      'Advanced reasoning',
      'Code generation and analysis',
      'Image and text processing',
      'Audio understanding'
    ],
    useCases: [
      'Software development',
      'Content creation',
      'Education',
      'Research',
      'Creative projects'
    ],
    apiUrl: 'https://ai.google.dev/docs',
    documentationUrl: 'https://ai.google.dev/docs/gemini_pro',
    pricing: 'Starting at $0.00025/1K characters',
    releaseDate: '2024-02-15',
    tags: ['Gemini', 'Multimodal', 'AI', 'Google'],
    rating: 4.7
  },
  {
    id: 'dall-e-3',
    name: 'DALL·E 3',
    provider: 'OpenAI',
    description: 'DALL·E 3 is an advanced image generation model that creates highly detailed and accurate images from natural language descriptions.',
    category: 'Image Generation',
    capabilities: [
      'High-quality image generation',
      'Detailed artistic control',
      'Style consistency',
      'Multiple variations',
      'Editing and variations'
    ],
    useCases: [
      'Digital art creation',
      'Marketing materials',
      'Product visualization',
      'Concept art',
      'Illustration'
    ],
    apiUrl: 'https://platform.openai.com/docs/api-reference/images',
    documentationUrl: 'https://platform.openai.com/docs/guides/images',
    pricing: 'Starting at $0.02/image',
    releaseDate: '2024-01-25',
    tags: ['DALL-E', 'Image Generation', 'AI', 'Art'],
    rating: 4.8
  },
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    provider: 'Stability AI',
    description: 'Stable Diffusion XL is an open-source image generation model known for its high-quality outputs and community-driven development.',
    category: 'Image Generation',
    capabilities: [
      'High-resolution image generation',
      'Style transfer',
      'Image-to-image translation',
      'Inpainting and outpainting',
      'Custom model training'
    ],
    useCases: [
      'Art creation',
      'Design prototyping',
      'Content generation',
      'Game asset creation',
      'Photo editing'
    ],
    apiUrl: 'https://platform.stability.ai/docs/api-reference',
    documentationUrl: 'https://platform.stability.ai/docs/guides/generate-images',
    pricing: 'Starting at $0.002/image',
    releaseDate: '2024-02-01',
    tags: ['Stable Diffusion', 'Image Generation', 'AI', 'Open Source'],
    rating: 4.6
  },
  {
    id: 'whisper-v3',
    name: 'Whisper v3',
    provider: 'OpenAI',
    description: 'Whisper v3 is a state-of-the-art speech recognition model that can transcribe and translate audio in multiple languages.',
    category: 'Speech Recognition',
    capabilities: [
      'Multilingual transcription',
      'Language translation',
      'Robust noise handling',
      'Speaker diarization',
      'Timestamp generation'
    ],
    useCases: [
      'Audio transcription',
      'Language learning',
      'Content accessibility',
      'Meeting transcription',
      'Subtitle generation'
    ],
    apiUrl: 'https://platform.openai.com/docs/api-reference/audio',
    documentationUrl: 'https://platform.openai.com/docs/guides/speech-to-text',
    pricing: 'Starting at $0.006/minute',
    releaseDate: '2024-02-20',
    tags: ['Whisper', 'Speech Recognition', 'AI', 'Audio'],
    rating: 4.7
  },
  {
    id: 'llama-2',
    name: 'LLaMA 2',
    provider: 'Meta AI',
    description: 'LLaMA 2 is Meta\'s open-source large language model, designed for research and commercial use with improved performance and safety features.',
    category: 'Language Models',
    capabilities: [
      'Open-source deployment',
      'Fine-tuning capabilities',
      'Context understanding',
      'Multiple model sizes',
      'Commercial usage allowed'
    ],
    useCases: [
      'Custom AI applications',
      'Research projects',
      'Enterprise solutions',
      'Educational tools',
      'Content generation'
    ],
    apiUrl: 'https://ai.meta.com/llama/',
    documentationUrl: 'https://github.com/facebookresearch/llama',
    pricing: 'Free (Open Source)',
    releaseDate: '2024-01-15',
    tags: ['LLaMA', 'Open Source', 'AI', 'Meta'],
    rating: 4.5
  },
  {
    id: 'palm-2',
    name: 'PaLM 2',
    provider: 'Google',
    description: 'PaLM 2 is Google\'s advanced language model optimized for reasoning, coding, and multilingual tasks.',
    category: 'Language Models',
    capabilities: [
      'Advanced reasoning',
      'Multilingual support',
      'Code generation',
      'Mathematical computation',
      'Knowledge retrieval'
    ],
    useCases: [
      'Language translation',
      'Code development',
      'Research assistance',
      'Educational tools',
      'Content creation'
    ],
    apiUrl: 'https://developers.generativeai.google/products/palm',
    documentationUrl: 'https://developers.generativeai.google/guide/palm_api_overview',
    pricing: 'Contact for pricing',
    releaseDate: '2024-02-28',
    tags: ['PaLM', 'Google', 'AI', 'Language Model'],
    rating: 4.6
  },
  {
    id: 'midjourney-v6',
    name: 'Midjourney v6',
    provider: 'Midjourney',
    description: 'Midjourney v6 is an advanced AI image generation system known for its artistic quality and creative capabilities.',
    category: 'Image Generation',
    capabilities: [
      'Photorealistic image generation',
      'Advanced style control',
      'Improved composition',
      'Better prompt understanding',
      'Consistent quality'
    ],
    useCases: [
      'Digital art creation',
      'Concept visualization',
      'Marketing materials',
      'Book illustrations',
      'Design inspiration'
    ],
    apiUrl: 'https://docs.midjourney.com/docs',
    documentationUrl: 'https://docs.midjourney.com',
    pricing: 'Starting at $10/month',
    releaseDate: '2024-01-30',
    tags: ['Midjourney', 'Image Generation', 'AI', 'Art'],
    rating: 4.8
  },
  {
    id: 'cohere-command',
    name: 'Cohere Command',
    provider: 'Cohere',
    description: 'Cohere Command is an enterprise-focused language model optimized for business applications and custom deployments.',
    category: 'Language Models',
    capabilities: [
      'Enterprise customization',
      'Domain adaptation',
      'Multilingual support',
      'Content generation',
      'Classification tasks'
    ],
    useCases: [
      'Customer service',
      'Content moderation',
      'Document analysis',
      'Market research',
      'Business intelligence'
    ],
    apiUrl: 'https://docs.cohere.com/reference/about',
    documentationUrl: 'https://docs.cohere.com',
    pricing: 'Contact for enterprise pricing',
    releaseDate: '2024-02-10',
    tags: ['Cohere', 'Enterprise', 'AI', 'NLP'],
    rating: 4.5
  }
];

const categories = Array.from(new Set(aiModels.map(model => model.category)));

export default function LaunchesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredModels = aiModels
    .filter(model => {
      const matchesSearch = 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || model.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      }
      return b.rating - a.rating;
    });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Model Launches</h1>
          <p className="text-xl text-gray-600">
            Discover the latest and most powerful AI models from leading providers
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI models by name, provider, or features..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Category Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>{selectedCategory || 'All Categories'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showCategoryDropdown && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md ${
                        !selectedCategory ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md ${
                          selectedCategory === category ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'rating')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer hover:bg-gray-50"
            >
              <option value="date">Latest Releases</option>
              <option value="rating">Highest Rated</option>
            </select>

            {/* Active Filters */}
            {(selectedCategory || searchQuery) && (
              <div className="flex items-center gap-2">
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {selectedCategory}
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="hover:bg-blue-200 rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Search: {searchQuery}
                    <button
                      onClick={() => setSearchQuery('')}
                      className="hover:bg-blue-200 rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map(model => (
            <div key={model.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">{model.name}</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{model.provider}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {model.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-medium">{model.rating}</span>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{model.description}</p>

                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Key Capabilities
                  </h3>
                  <ul className="space-y-2">
                    {model.capabilities.map((capability, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Command className="w-4 h-4 text-purple-500" />
                    Use Cases
                  </h3>
                  <ul className="space-y-2">
                    {model.useCases.map((useCase, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Released
                    </span>
                    <span className="font-medium">
                      {new Date(model.releaseDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      Pricing
                    </span>
                    <span className="font-medium">{model.pricing}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {model.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6 space-y-2">
                  <a
                    href={model.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Book className="w-4 h-4" />
                    <span>Documentation</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={model.apiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Code className="w-4 h-4" />
                    <span>API Reference</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredModels.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No AI models found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}