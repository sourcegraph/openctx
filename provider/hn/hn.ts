import * as cheerio from 'cheerio'

interface HNArticle {
    title: string
    url: string
}

export async function fetchHackerNewsHomepage(): Promise<string> {
    const HN_URL = 'https://news.ycombinator.com'

    const response = await fetch(HN_URL)

    if (!response.ok) {
        throw new Error(`Failed to fetch HN homepage: ${response.status}`)
    }

    const html = await response.text()
    return html
}

export function extractArticles(html: string): HNArticle[] {
    const $ = cheerio.load(html)
    const articles: HNArticle[] = []

    $('.athing').each((_, element) => {
        const titleElement = $(element).find('.titleline > a')
        const title = titleElement.text().trim()
        const url = titleElement.attr('href') || ''

        if (title && url) {
            articles.push({ title, url })
        }
    })

    return articles
}
