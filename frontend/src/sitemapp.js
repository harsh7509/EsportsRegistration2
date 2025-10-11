const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

(async () => {
  const sitemap = new SitemapStream({ hostname: 'https://thearenapulse.xyz' });

  const links = [
    { url: '/', changefreq: 'weekly', priority: 1.0 },
    { url: '/scrims', changefreq: 'weekly', priority: 0.8 },
    { url: '/tournaments', changefreq: 'weekly', priority: 0.8 },
    { url: '/rankings', changefreq: 'weekly', priority: 0.7 },
    { url: '/login', changefreq: 'yearly', priority: 0.3 },
    { url: '/signup', changefreq: 'yearly', priority: 0.3 },
    { url: '/org/verify', changefreq: 'monthly', priority: 0.6 },
    { url: '/dashboard/player', changefreq: 'weekly', priority: 0.5 },
    { url: '/dashboard/org', changefreq: 'weekly', priority: 0.5 },
  ];

  links.forEach(link => sitemap.write(link));
  sitemap.end();

  const data = await streamToPromise(sitemap);
  createWriteStream('./public/sitemap.xml').write(data);
  console.log('✅ Sitemap created: /public/sitemap.xml');
})();


