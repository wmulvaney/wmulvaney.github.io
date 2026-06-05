import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Parser from 'rss-parser';

const FEED_URL = 'https://williammulvaney.substack.com/feed';
const OUTPUT_PATH = path.resolve(process.cwd(), 'public', 'substack-feed.json');
const DEFAULT_SUBSTACK_IMAGE = 'https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7c64c3cd-dcf7-482a-8beb-77af1dd7e752_1600x1600.jpeg';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['description', 'description'],
      ['enclosure', 'enclosure']
    ]
  }
});

const cleanHtml = (value = '') => value.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');

const firstImageFromHtml = (...htmlBlocks) => {
  const html = htmlBlocks.filter(Boolean).join('\n');
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || '';
};

const normalizeArticle = (item) => {
  const content = cleanHtml(item.contentEncoded || item['content:encoded'] || item.content || '');
  const description = cleanHtml(item.description || item.contentSnippet || '');
  const enclosureUrl = item.enclosure?.url || '';
  const image = enclosureUrl || firstImageFromHtml(content, description) || DEFAULT_SUBSTACK_IMAGE;
  const subtitle = description.split('\n')[0].replace(/<[^>]+>/g, '').trim();

  return {
    title: item.title || 'No title',
    subtitle,
    pubDate: new Date(item.pubDate || '').toDateString(),
    link: item.link || '#',
    description,
    content,
    hasImage: Boolean(image),
    image
  };
};

const run = async () => {
  const feed = await parser.parseURL(FEED_URL);
  const articles = (feed.items || []).map(normalizeArticle);

  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        description: feed.description || 'No description available',
        articles
      },
      null,
      2
    )
  );

  console.log(`Wrote ${articles.length} Substack articles to ${OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error('Failed to generate Substack feed JSON');
  console.error(error);
  process.exit(1);
});
