import { CronJob } from 'cron';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import TurndownService from 'turndown';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Markdown converter
const turndownService = new TurndownService();

// Sources to scrape
const sources = [
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog',
    type: 'updates'
  },
  {
    name: 'Google AI Blog',
    url: 'https://ai.googleblog.com',
    type: 'updates'
  },
  {
    name: 'Meta AI Blog',
    url: 'https://ai.meta.com/blog',
    type: 'updates'
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog',
    type: 'launches'
  },
  {
    name: 'Anthropic Blog',
    url: 'https://www.anthropic.com/blog',
    type: 'launches'
  }
];

async function scrapeSource(source) {
  try {
    logger.info(`Scraping ${source.name}...`);
    
    const response = await fetch(source.url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const articles = [];
    
    // Customize selectors based on the source
    const articleSelectors = {
      'OpenAI Blog': '.blog-post',
      'Google AI Blog': '.post',
      'Meta AI Blog': '.blog-card',
      'Hugging Face Blog': '.blog-entry',
      'Anthropic Blog': '.post-preview'
    };
    
    $(articleSelectors[source.name]).each((i, el) => {
      const title = $(el).find('h2').first().text().trim();
      const summary = $(el).find('p').first().text().trim();
      const link = $(el).find('a').first().attr('href');
      const date = $(el).find('time').first().text().trim();
      
      if (title && summary) {
        articles.push({
          title,
          summary,
          link,
          date,
          source: source.name
        });
      }
    });
    
    return articles;
  } catch (error) {
    logger.error(`Error scraping ${source.name}: ${error.message}`);
    return [];
  }
}

async function processArticle(article) {
  try {
    // Fetch full article content
    const response = await fetch(article.link);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract main content (customize selector based on source)
    const content = $('.article-content').html();
    const markdown = turndownService.turndown(content);
    
    return {
      ...article,
      content: markdown
    };
  } catch (error) {
    logger.error(`Error processing article ${article.title}: ${error.message}`);
    return article;
  }
}

async function publishToSupabase(articles, type) {
  try {
    const table = type === 'updates' ? 'ai_updates' : 'ai_launches';
    
    for (const article of articles) {
      // Check if article already exists
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('title', article.title)
        .single();
      
      if (!existing) {
        const { error } = await supabase
          .from(table)
          .insert({
            title: article.title,
            summary: article.summary,
            content: article.content,
            source: article.source,
            source_url: article.link,
            published_at: article.date,
            status: 'published'
          });
        
        if (error) {
          logger.error(`Error publishing article: ${error.message}`);
        } else {
          logger.info(`Published: ${article.title}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error publishing to Supabase: ${error.message}`);
  }
}

async function runScraper() {
  logger.info('Starting scraper job...');
  
  for (const source of sources) {
    const articles = await scrapeSource(source);
    const processedArticles = await Promise.all(
      articles.map(article => processArticle(article))
    );
    await publishToSupabase(processedArticles, source.type);
  }
  
  logger.info('Scraper job completed');
}

// Run scraper every day at 6 AM
const job = new CronJob(
  '0 6 * * *',
  runScraper,
  null,
  true,
  'UTC'
);

// Also run immediately on script start
runScraper();

logger.info('Scraper scheduled to run daily at 6 AM UTC');