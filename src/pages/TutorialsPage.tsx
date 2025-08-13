import React, { useState } from 'react';
import { Book, Code, Brain, Layers, Terminal, MessageSquare, ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: string;
  subsections?: Section[];
}

const aiBasics: Section[] = [
  {
    id: 'what-is-ai',
    title: 'What is Artificial Intelligence?',
    content: `
Artificial Intelligence (AI) refers to computer systems that can perform tasks that typically require human intelligence. These tasks include:

- Visual perception and image recognition
- Speech recognition and natural language processing
- Decision making and problem solving
- Learning and adaptation

AI systems use various techniques to process data and make decisions, with machine learning being one of the most prominent approaches. Modern AI applications range from virtual assistants like Siri to complex systems that can diagnose diseases or play chess at grandmaster level.

Key Concepts:
1. Machine Learning: Systems that learn from data
2. Neural Networks: Computing systems inspired by biological brains
3. Deep Learning: Advanced neural networks with multiple layers
4. Natural Language Processing: Understanding and generating human language
5. Computer Vision: Understanding and processing visual information
    `
  },
  {
    id: 'ai-types',
    title: 'Types of AI',
    content: `
AI can be categorized into different types based on their capabilities:

1. Narrow/Weak AI
   - Designed for specific tasks
   - Examples: Spam filters, recommendation systems
   - Currently most common form of AI

2. General/Strong AI
   - Human-level intelligence across various domains
   - Still theoretical and not yet achieved
   - Goal of many AI researchers

3. Super AI
   - Hypothetical AI surpassing human intelligence
   - Subject of much debate and speculation
   - Raises important ethical considerations
    `
  },
  {
    id: 'ai-applications',
    title: 'Real-world Applications',
    content: `
AI is transforming various industries:

- Healthcare: Disease diagnosis, drug discovery
- Finance: Fraud detection, algorithmic trading
- Transportation: Self-driving vehicles, traffic optimization
- Entertainment: Content recommendations, game AI
- Business: Customer service, process automation
- Education: Personalized learning, automated grading
    `
  }
];

const buildingAI: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with AI Development',
    content: `
Starting your AI development journey:

1. Prerequisites:
   - Programming basics (Python recommended)
   - Mathematics fundamentals
   - Understanding of algorithms
   - Basic statistics knowledge

2. Essential Tools:
   - Python programming language
   - Jupyter Notebooks
   - Popular AI frameworks (TensorFlow, PyTorch)
   - Version control (Git)
   - Cloud platforms (Google Colab, AWS, Azure)

3. Learning Path:
   - Start with basic ML algorithms
   - Move to neural networks
   - Explore deep learning
   - Specialize in specific areas
    `
  },
  {
    id: 'frameworks',
    title: 'AI Frameworks and Tools',
    content: `
Popular AI Development Frameworks:

1. TensorFlow
   - Developed by Google
   - Comprehensive ecosystem
   - Good for production deployment

2. PyTorch
   - Developed by Facebook
   - Popular in research
   - Dynamic computational graphs

3. Scikit-learn
   - Simple and efficient
   - Great for classical ML
   - Excellent documentation

4. Fast.ai
   - High-level wrapper for PyTorch
   - Focused on practical applications
   - Great for beginners
    `
  }
];

const technicalDetails: Section[] = [
  {
    id: 'ml-algorithms',
    title: 'Machine Learning Algorithms',
    content: `
Core Machine Learning Algorithms:

1. Supervised Learning
   - Linear Regression
   - Logistic Regression
   - Decision Trees
   - Random Forests
   - Support Vector Machines

2. Unsupervised Learning
   - K-means Clustering
   - Hierarchical Clustering
   - Principal Component Analysis
   - Anomaly Detection

3. Reinforcement Learning
   - Q-Learning
   - Deep Q Networks
   - Policy Gradient Methods
    `
  },
  {
    id: 'neural-networks',
    title: 'Neural Networks',
    content: `
Understanding Neural Networks:

1. Basic Components
   - Neurons (nodes)
   - Weights and biases
   - Activation functions
   - Layers

2. Types of Neural Networks
   - Feedforward Neural Networks
   - Convolutional Neural Networks (CNN)
   - Recurrent Neural Networks (RNN)
   - Transformers

3. Training Process
   - Forward propagation
   - Backpropagation
   - Gradient descent
   - Loss functions
    `
  }
];

const aiLayers: Section[] = [
  {
    id: 'input-layer',
    title: 'Input Layer',
    content: `
The Input Layer:

- Receives raw data
- Performs initial preprocessing
- Handles different data types:
  * Numerical data
  * Categorical data
  * Text data
  * Image data
  * Audio data
    `
  },
  {
    id: 'hidden-layers',
    title: 'Hidden Layers',
    content: `
Hidden Layers:

1. Purpose
   - Feature extraction
   - Pattern recognition
   - Transformation of data

2. Architecture
   - Number of layers
   - Neurons per layer
   - Connections between layers

3. Activation Functions
   - ReLU
   - Sigmoid
   - Tanh
   - LeakyReLU
    `
  },
  {
    id: 'output-layer',
    title: 'Output Layer',
    content: `
The Output Layer:

1. Functions
   - Final predictions
   - Classification probabilities
   - Regression values

2. Activation Functions
   - Softmax for classification
   - Linear for regression
   - Sigmoid for binary classification

3. Interpretation
   - Understanding outputs
   - Confidence scores
   - Error analysis
    `
  }
];

const pythonLevels = {
  beginner: [
    {
      id: 'python-basics',
      title: 'Python Basics',
      content: `
Python Fundamentals:

1. Variables and Data Types
   - Numbers (int, float)
   - Strings
   - Lists
   - Dictionaries
   - Tuples

2. Control Flow
   - if/else statements
   - for loops
   - while loops
   - break/continue

3. Functions
   - Defining functions
   - Parameters
   - Return values
   - Lambda functions
      `
    }
  ],
  intermediate: [
    {
      id: 'python-intermediate',
      title: 'Intermediate Python',
      content: `
Advanced Python Concepts:

1. Object-Oriented Programming
   - Classes
   - Inheritance
   - Polymorphism
   - Encapsulation

2. Error Handling
   - Try/except blocks
   - Custom exceptions
   - Context managers

3. File Operations
   - Reading/writing files
   - Working with CSV/JSON
   - File handling best practices
      `
    }
  ],
  advanced: [
    {
      id: 'python-advanced',
      title: 'Advanced Python',
      content: `
Expert Python Topics:

1. Decorators
   - Function decorators
   - Class decorators
   - Decorator factories

2. Generators
   - Yield statement
   - Generator expressions
   - Async generators

3. Metaclasses
   - Class creation
   - Inheritance
   - Abstract base classes

4. Concurrency
   - Threading
   - Multiprocessing
   - Asyncio
      `
    }
  ]
};

const mlLevels = {
  beginner: [
    {
      id: 'ml-basics',
      title: 'Machine Learning Basics',
      content: `
Introduction to Machine Learning:

1. Core Concepts
   - Supervised vs Unsupervised Learning
   - Training and Testing
   - Model Evaluation
   - Cross-validation

2. Basic Algorithms
   - Linear Regression
   - Logistic Regression
   - K-Nearest Neighbors
   - Decision Trees

3. Data Preprocessing
   - Data cleaning
   - Feature scaling
   - Handling missing values
   - Encoding categorical variables
      `
    }
  ],
  intermediate: [
    {
      id: 'ml-intermediate',
      title: 'Intermediate Machine Learning',
      content: `
Advanced ML Concepts:

1. Ensemble Methods
   - Random Forests
   - Gradient Boosting
   - XGBoost
   - LightGBM

2. Feature Engineering
   - Feature selection
   - Feature extraction
   - Dimensionality reduction
   - PCA

3. Model Optimization
   - Hyperparameter tuning
   - Cross-validation strategies
   - Grid and random search
   - Early stopping
      `
    }
  ],
  advanced: [
    {
      id: 'ml-advanced',
      title: 'Advanced Machine Learning',
      content: `
Expert ML Topics:

1. Deep Learning
   - Neural Network Architecture
   - Convolutional Neural Networks
   - Recurrent Neural Networks
   - Transformers

2. Advanced Techniques
   - Transfer Learning
   - Few-shot Learning
   - Reinforcement Learning
   - GANs

3. Production ML
   - Model deployment
   - Scaling ML systems
   - MLOps
   - Model monitoring
      `
    }
  ]
};

function TutorialsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [showChat, setShowChat] = useState(false);

  const toggleSection = (sectionId: string) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const renderSection = (section: Section, level = 0) => (
    <div key={section.id} className="mb-4">
      <button
        onClick={() => toggleSection(section.id)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">{section.title}</span>
        {activeSection === section.id ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      {activeSection === section.id && (
        <div className="mt-4 p-6 bg-white rounded-lg shadow-sm">
          <pre className="whitespace-pre-wrap text-gray-700">{section.content}</pre>
          
          {section.subsections?.map(subsection => 
            renderSection(subsection, level + 1)
          )}
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <MessageSquare className="w-4 h-4" />
              Ask a Question
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Learning Hub</h1>

        {/* AI Basics */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold">Understanding AI</h2>
          </div>
          {aiBasics.map(section => renderSection(section))}
        </section>

        {/* Building AI */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Code className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-semibold">Building AI</h2>
          </div>
          {buildingAI.map(section => renderSection(section))}
        </section>

        {/* Technical Details */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-semibold">Technical Deep Dive</h2>
          </div>
          {technicalDetails.map(section => renderSection(section))}
        </section>

        {/* AI Layers */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Layers className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-semibold">AI Architecture Layers</h2>
          </div>
          {aiLayers.map(section => renderSection(section))}
        </section>

        {/* Python Learning */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Code className="w-6 h-6 text-yellow-600" />
            <h2 className="text-2xl font-semibold">Python Programming</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Beginner</h3>
              {pythonLevels.beginner.map(section => renderSection(section))}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Intermediate</h3>
              {pythonLevels.intermediate.map(section => renderSection(section))}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Advanced</h3>
              {pythonLevels.advanced.map(section => renderSection(section))}
            </div>
          </div>
        </section>

        {/* Machine Learning */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-semibold">Machine Learning</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Beginner</h3>
              {mlLevels.beginner.map(section => renderSection(section))}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Intermediate</h3>
              {mlLevels.intermediate.map(section => renderSection(section))}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Advanced</h3>
              {mlLevels.advanced.map(section => renderSection(section))}
            </div>
          </div>
        </section>

        {/* Additional Resources */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://www.coursera.org/specializations/deep-learning"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Book className="w-4 h-4" />
              <span>Deep Learning Specialization</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.fast.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Book className="w-4 h-4" />
              <span>Fast.ai Practical Deep Learning</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.tensorflow.org/tutorials"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Book className="w-4 h-4" />
              <span>TensorFlow Tutorials</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://pytorch.org/tutorials/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Book className="w-4 h-4" />
              <span>PyTorch Tutorials</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* Chat Interface */}
        {showChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Ask a Question</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowChat(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement question handling
                    alert('This feature is coming soon!');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Question
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TutorialsPage;