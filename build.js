#!/usr/bin/env node
// Builds the static site into dist/: one page per language from src/template.html + src/i18n/<lang>.json.
// Usage: node build.js
'use strict';

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://gassafe.ge';
// Google Analytics 4 measurement ID ("G-XXXXXXXXXX"); leave empty to build the site without analytics
const GA_MEASUREMENT_ID = 'G-7XRE0SNFYB';
const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

// First entry is the default language, served from the site root and used as x-default
const LANGUAGES = [
    { code: 'ka', dir: '', ogLocale: 'ka_GE', name: 'ქართული' },
    { code: 'en', dir: 'en/', ogLocale: 'en_US', name: 'English' },
    { code: 'ru', dir: 'ru/', ogLocale: 'ru_RU', name: 'Русский' }
];

// Service keys used in the template (data-service) → i18n key prefix for the booking option name
const SERVICES = ['detector', 'leak', 'appliance', 'piping'];

function fail(message) {
    console.error(`Build failed: ${message}`);
    process.exit(1);
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function capitalize(word) {
    return word[0].toUpperCase() + word.slice(1);
}

function pageUrl(lang) {
    return `${SITE_URL}/${lang.dir}`;
}

// Relative link from one language page to another (works on any host and in subfolders)
function relativeUrl(from, to) {
    if (from === to) return './';
    return (from.dir ? '../' : './') + to.dir;
}

function loadLocales() {
    const locales = {};
    for (const lang of LANGUAGES) {
        const file = path.join(SRC, 'i18n', `${lang.code}.json`);
        try {
            locales[lang.code] = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (err) {
            fail(`${path.relative(__dirname, file)}: ${err.message}`);
        }
    }

    // Every language must have exactly the same keys as the default one
    const base = LANGUAGES[0].code;
    for (const section of ['page', 'js']) {
        const expected = Object.keys(locales[base][section]);
        for (const lang of LANGUAGES.slice(1)) {
            const actual = Object.keys(locales[lang.code][section]);
            const missing = expected.filter(k => !actual.includes(k));
            const extra = actual.filter(k => !expected.includes(k));
            if (missing.length) fail(`${lang.code}.json "${section}" is missing: ${missing.join(', ')}`);
            if (extra.length) fail(`${lang.code}.json "${section}" has keys not in ${base}.json: ${extra.join(', ')}`);
        }
    }
    return locales;
}

// Prices are defined once in the template (data-price on #book-service options)
function readServicePrices(template) {
    const prices = {};
    for (const [, service, price] of template.matchAll(/data-service="(\w+)" data-price="(\d+)"/g)) {
        prices[service] = Number(price);
    }
    for (const service of SERVICES) {
        if (!prices[service]) fail(`no data-price for service "${service}" in template.html`);
    }
    return prices;
}

function hreflangLinks() {
    const links = LANGUAGES.map(l => `    <link rel="alternate" hreflang="${l.code}" href="${pageUrl(l)}">`);
    links.push(`    <link rel="alternate" hreflang="x-default" href="${pageUrl(LANGUAGES[0])}">`);
    return links.join('\n');
}

function ogLocaleAlternates(lang) {
    return LANGUAGES.filter(l => l !== lang)
        .map(l => `    <meta property="og:locale:alternate" content="${l.ogLocale}">`)
        .join('\n');
}

function langLinks(lang) {
    return LANGUAGES.map(l => {
        const active = l === lang;
        const cls = active
            ? 'px-2 py-1 rounded-md bg-slate-800 text-white font-semibold'
            : 'px-2 py-1 rounded-md hover:text-orange-400 transition-colors';
        const current = active ? ' aria-current="page"' : '';
        return `                <a href="${relativeUrl(lang, l)}" hreflang="${l.code}" lang="${l.code}" class="${cls}"${current}>${l.name}</a>`;
    }).join('\n');
}

function jsonLd(lang, text, prices) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'HomeAndConstructionBusiness',
        '@id': `${SITE_URL}/#business`,
        name: 'GAS-SAFE',
        url: pageUrl(lang),
        description: text.metaDescription,
        telephone: '+995571504600',
        email: 'info@gassafe.ge',
        priceRange: `${Math.min(...Object.values(prices))}-${Math.max(...Object.values(prices))} GEL`,
        address: { '@type': 'PostalAddress', addressLocality: text.cityTbilisi, addressCountry: 'GE' },
        areaServed: [text.cityTbilisi, text.cityRustavi, text.cityBatumi, text.cityKutaisi, text.cityMtskheta]
            .map(name => ({ '@type': 'City', name })),
        openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '00:00',
            closes: '23:59'
        },
        availableLanguage: LANGUAGES.map(l => l.code),
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: text.servicesTitle,
            itemListElement: SERVICES.map(service => ({
                '@type': 'Offer',
                itemOffered: { '@type': 'Service', name: text[`bookOpt${capitalize(service)}Value`] },
                priceSpecification: { '@type': 'PriceSpecification', minPrice: prices[service], priceCurrency: 'GEL' }
            }))
        }
    };
    // Escape "<" so the JSON can never close the <script> tag
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

function render(template, lang, locale, prices) {
    const computed = {
        lang: lang.code,
        assetBase: lang.dir ? '../' : '',
        canonicalUrl: pageUrl(lang),
        hreflangLinks: hreflangLinks(),
        ogLocale: lang.ogLocale,
        ogLocaleAlternates: ogLocaleAlternates(lang),
        langLinks: langLinks(lang),
        jsonLd: jsonLd(lang, locale.page, prices),
        analyticsScript: GA_MEASUREMENT_ID
            ? `    <script src="${lang.dir ? '../' : ''}js/analytics.js" data-ga-id="${escapeHtml(GA_MEASUREMENT_ID)}"></script>`
            : ''
    };

    return template
        // Leading comment is for developers only
        .replace(/<!--[\s\S]*?-->\n/, '')
        .replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => {
            if (!(key in computed)) fail(`unknown {{{${key}}}} in template.html`);
            return computed[key];
        })
        .replace(/\{\{(\w+)\}\}/g, (_, key) => {
            if (!(key in locale.page)) fail(`{{${key}}} is used in template.html but missing in ${lang.code}.json`);
            return escapeHtml(locale.page[key]);
        });
}

function sitemap() {
    const today = new Date().toISOString().slice(0, 10);
    const alternates = [
        ...LANGUAGES.map(l => `        <xhtml:link rel="alternate" hreflang="${l.code}" href="${pageUrl(l)}"/>`),
        `        <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(LANGUAGES[0])}"/>`
    ].join('\n');
    const urls = LANGUAGES.map(l => [
        '    <url>',
        `        <loc>${pageUrl(l)}</loc>`,
        `        <lastmod>${today}</lastmod>`,
        alternates,
        '    </url>'
    ].join('\n')).join('\n');
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        urls,
        '</urlset>',
        ''
    ].join('\n');
}

function build() {
    const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
    const locales = loadLocales();
    const prices = readServicePrices(template);

    fs.rmSync(DIST, { recursive: true, force: true });
    fs.cpSync(path.join(SRC, 'css'), path.join(DIST, 'css'), { recursive: true });
    fs.cpSync(path.join(SRC, 'js'), path.join(DIST, 'js'), { recursive: true });
    fs.mkdirSync(path.join(DIST, 'js', 'i18n'), { recursive: true });

    for (const lang of LANGUAGES) {
        const locale = locales[lang.code];
        const outDir = path.join(DIST, lang.dir);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'index.html'), render(template, lang, locale, prices));
        fs.writeFileSync(
            path.join(DIST, 'js', 'i18n', `${lang.code}.js`),
            `// Generated by build.js from src/i18n/${lang.code}.json\nwindow.I18N = ${JSON.stringify(locale.js, null, 4)};\n`
        );
        console.log(`  ${lang.code}  dist/${lang.dir}index.html`);
    }

    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap());
    fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
    console.log('  dist/sitemap.xml, dist/robots.txt\nDone.');
}

build();
