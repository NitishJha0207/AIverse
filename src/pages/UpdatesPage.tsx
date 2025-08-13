// File contents same as before but with line 98 changed from:
//      title: 'Meta's New AI Translation Model',
// to:
//      title: "Meta's New AI Translation Model",

import React, { useState, useEffect, useRef } from 'react';
import { Search, Newspaper, TrendingUp, Calendar, ExternalLink, Tag, ThumbsUp, MessageSquare, Share2, Bookmark, Filter, ChevronDown, X } from 'lucide-react';

interface AIUpdate {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  sourceUrl: string;
  category: string;
  tags: string[];
  publishedAt: string;
  imageUrl: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

// Sample AI updates data
const aiUpdates: AIUpdate[] = [
  {
    id: '1',
    title: 'GPT-5 Development Announcement',
    summary: 'OpenAI confirms development of GPT-5 with groundbreaking multimodal capabilities',
    content: `OpenAI has officially announced the development of GPT-5, promising significant advances in multimodal understanding and generation. The new model is expected to seamlessly integrate text, images, audio, and video processing capabilities.

Key improvements include:
- Enhanced reasoning capabilities
- Better factual accuracy
- Improved context understanding
- Real-time multimodal processing
- Advanced code generation features`,
    source: 'OpenAI Blog',
    sourceUrl: 'https://openai.com/blog',
    category: 'Language Models',
    tags: ['GPT-5', 'OpenAI', 'Multimodal AI', 'Large Language Models'],
    publishedAt: '2025-03-15',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad095',
    engagement: {
      likes: 1520,
      comments: 342,
      shares: 728
    }
  },
  {
    id: '2',
    title: 'Google Introduces Advanced AI Chip',
    summary: 'New TPU v5 promises 2x performance improvement for AI training and inference',
    content: `Google has unveiled its latest Tensor Processing Unit (TPU v5), specifically designed for AI workloads. The new chip offers significant improvements in both training and inference performance.

Technical Specifications:
- 2x faster training speed
- 40% lower power consumption
- Enhanced memory bandwidth
- Improved parallel processing
- Better cost efficiency for large-scale deployments`,
    source: 'Google AI Blog',
    sourceUrl: 'https://ai.google/blog',
    category: 'Hardware',
    tags: ['TPU', 'Google', 'AI Hardware', 'Machine Learning'],
    publishedAt: '2025-03-14',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    engagement: {
      likes: 890,
      comments: 156,
      shares: 445
    }
  },
  {
    id: '3',
    title: 'Breakthrough in AI Medical Diagnosis',
    summary: 'New AI system achieves 99% accuracy in early cancer detection',
    content: `A collaborative research team has developed an AI system that can detect early-stage cancer with unprecedented accuracy. The system uses advanced deep learning techniques combined with medical imaging.

Research Highlights:
- 99% accuracy in early detection
- Reduced false positives by 75%
- Works across multiple cancer types
- Real-time analysis capabilities
- Integrated with existing medical systems`,
    source: 'Nature AI',
    sourceUrl: 'https://nature.com/articles',
    category: 'Healthcare',
    tags: ['Medical AI', 'Cancer Detection', 'Healthcare', 'Deep Learning'],
    publishedAt: '2025-03-13',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
    engagement: {
      likes: 2100,
      comments: 428,
      shares: 1256
    }
  },
  {
    id: '4',
    title: "Meta's New AI Translation Model",
    summary: 'Universal translator achieves human-level accuracy across 200 languages',
    content: `Meta has released a new AI translation model that can accurately translate between 200 languages in real-time. The model shows remarkable understanding of cultural context and idiomatic expressions.

Features:
- Real-time translation
- Cultural context awareness
- Dialect support
- Offline capabilities
- Low-latency processing`,
    source: 'Meta AI Research',
    sourceUrl: 'https://ai.meta.com/blog',
    category: 'Language Models',
    tags: ['Translation', 'Meta', 'NLP', 'Multilingual'],
    publishedAt: '2025-03-12',
    imageUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d',
    engagement: {
      likes: 1350,
      comments: 246,
      shares: 892
    }
  },
  {
    id: '5',
    title: 'Revolutionary AI Energy Grid Management',
    summary: 'AI system optimizes renewable energy distribution with 40% efficiency gain',
    content: `A new AI-powered grid management system has achieved breakthrough efficiency in renewable energy distribution. The system uses predictive analytics and real-time optimization to balance supply and demand.

Key Achievements:
- 40% improvement in distribution efficiency
- 30% reduction in energy waste
- Smart load balancing
- Weather-adaptive optimization
- Predictive maintenance capabilities`,
    source: 'Energy AI Journal',
    sourceUrl: 'https://energyai.org',
    category: 'Energy',
    tags: ['Renewable Energy', 'Grid Management', 'Sustainability', 'AI'],
    publishedAt: '2025-03-11',
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e',
    engagement: {
      likes: 945,
      comments: 182,
      shares: 567
    }
  }
];

const categories = Array.from(new Set(aiUpdates.map(update => update.category)));
const allTags = Array.from(new Set(aiUpdates.flatMap(update => update.tags)));

export default function UpdatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'engagement'>('date');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
        setShowTagsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredUpdates = aiUpdates
    .filter(update => {
      const matchesSearch = 
        update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        update.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        update.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || update.category === selectedCategory;
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tag => update.tags.includes(tag));
      
      return matchesSearch && matchesCategory && matchesTags;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return (
        b.engagement.likes + b.engagement.shares - 
        (a.engagement.likes + a.engagement.shares)
      );
    });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Updates & News</h1>
          <p className="text-xl text-gray-600">
            Stay informed about the latest breakthroughs and developments in AI
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
              placeholder="Search AI updates by title, content, or keywords..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4" ref={dropdownRef}>
            {/* Category Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowTagsDropdown(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>{selectedCategory || 'All Categories'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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

            {/* Tags Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTagsDropdown(!showTagsDropdown);
                  setShowCategoryDropdown(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              >
                <Tag className="w-4 h-4" />
                <span>{selectedTags.length ? `${selectedTags.length} Tags` : 'Select Tags'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showTagsDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showTagsDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-2">
                    {allTags.map(tag => (
                      <label
                        key={tag}
                        className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTags([...selectedTags, tag]);
                            } else {
                              setSelectedTags(selectedTags.filter(t => t !== tag));
                            }
                          }}
                          className="mr-2"
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'engagement')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer hover:bg-gray-50"
            >
              <option value="date">Latest First</option>
              <option value="engagement">Most Popular</option>
            </select>

            {/* Active Filters */}
            {(selectedCategory || selectedTags.length > 0 || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2">
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
                {selectedTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                      className="hover:bg-purple-200 rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    Search: {searchQuery}
                    <button
                      onClick={() => setSearchQuery('')}
                      className="hover:bg-gray-200 rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Updates Grid */}
        <div className="space-y-8">
          {filteredUpdates.map(update => (
            <article
              key={update.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start gap-6">
                  <img
                    src={update.imageUrl}
                    alt={update.title}
                    className="w-48 h-32 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                          {update.title}
                        </h2>
                        <p className="text-gray-600 mb-4">{update.summary}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={update.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Newspaper className="w-4 h-4" />
                          <span className="text-sm">{update.source}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(update.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Tag className="w-4 h-4" />
                        <span>{update.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-gray-500">
                          <ThumbsUp className="w-4 h-4" />
                          {update.engagement.likes}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <MessageSquare className="w-4 h-4" />
                          {update.engagement.comments}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Share2 className="w-4 h-4" />
                          {update.engagement.shares}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {update.tags.map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            if (!selectedTags.includes(tag)) {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-700 whitespace-pre-wrap">{update.content}</p>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-4">
                    <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">Like</span>
                    </button>
                    <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Comment</span>
                    </button>
                    <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600">
                      <Share2 className="w-4 h-4" />
                      <span className="text-sm">Share</span>
                    </button>
                  </div>
                  <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600">
                    <Bookmark className="w-4 h-4" />
                    <span className="text-sm">Save</span>
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredUpdates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No updates found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}