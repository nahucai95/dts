const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-core');

const TMDB_API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c'; // Tu clave de API de TMDb

const builder = new addonBuilder({
    id: 'org.myexampleaddon',
    version: '1.0.0',
    name: 'Cuevana',
    catalogs: [],
    resources: ['stream'],
    types: ['movie'],
    idPrefixes: ['tt']
});

async function getTmdbIdFromImdb(imdbId) {
    try {
        const response = await axios.get(https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id);
        return response.data.movie_results[0]?.id || null;
    } catch {
        return null;
    }
}

async function getLinksFromCuevana(tmdbId) {
    const url = https://cuevana.biz/pelicula/${tmdbId}/8;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        
        const links = [];
        $('li.clili[data-tr]').each((index, element) => {
            if ([1, 2, 3, 7, 8].includes(index)) {
                links.push($(element).attr('data-tr'));
            }
        });

        return links;
    } catch {
        return [];
    }
}

let browser;
let page;

async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true, // Cambia a false si necesitas ver la ejecución
            executablePath: '/usr/bin/chromium', // Asegúrate de que esta ruta sea correcta
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage'
            ],
        });
    }
    if (!page) {
        page = await browser.newPage();
    } else {
        await page.goto('about:blank'); // Asegúrate de que la página esté inicializada
    }
}

async function getVideoUrl(pageUrl) {
    await initBrowser();

    try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2' });

        const videoUrl = await page.evaluate(() => {
            const scriptTags = Array.from(document.getElementsByTagName('script'));
            for (const script of scriptTags) {
                const match = script.textContent.match(/var url = '(.*?)'/);
                if (match) {
                    return match[1];
                }
            }
            return null;
        });

        if (!videoUrl) return null;

        let m3u8Url = null;

        // Interceptar respuestas
        page.on('response', response => {
            if (response.url().includes('.m3u8')) {
                m3u8Url = response.url();
            }
        });

        await page.goto(videoUrl, { waitUntil: 'networkidle2' });

        await new Promise(resolve => {
            const checkM3U8Interval = setInterval(() => {
                if (m3u8Url) {
                    clearInterval(checkM3U8Interval);
                    resolve();
                }
            }, 50);

            setTimeout(() => {
                clearInterval(checkM3U8Interval);
                resolve();
            }, 5000);
        });

        return m3u8Url || null;
    } catch (error) {
        console.error('Error al obtener la URL del video:', error);
        return null;
    }
}

builder.defineStreamHandler(async function(args) {
    if (args.type === 'movie') {
        const imdbId = args.id;
        const tmdbId = await getTmdbIdFromImdb(imdbId);

        if (tmdbId) {
            const links = await getLinksFromCuevana(tmdbId);
            const streams = [];

            const streamNames = ['Streamwish', 'Filemoon', 'Voesx', 'Plustream', 'Vidhide'];

            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                const m3u8Url = await getVideoUrl(link);
                if (m3u8Url) {
                    streams.push({
                        url: m3u8Url,
                        type: 'mp4',
                        title: streamNames[i] || 'Calidad HD'
                    });
                }
            }

            return { streams };
        }
    }
    return { streams: [] };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
