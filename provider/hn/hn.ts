import axios from 'axios'
import * as cheerio from 'cheerio'

interface HNArticle {
    title: string
    url: string
}

async function fetchHNFrontPage(): Promise<HNArticle[]> {
    const HN_URL = 'https://news.ycombinator.com'

    try {
        const response = await axios.get(HN_URL)
        const $ = cheerio.load(response.data)
        const articles: HNArticle[] = []

        $('.titleline').each((_, element) => {
            const linkElement = $(element).find('a').first()
            const title = linkElement.text()
            const url = linkElement.attr('href') || ''

            if (title && url) {
                articles.push({
                    title: title.trim(),
                    url: url.startsWith('item?id=') ? `${HN_URL}/${url}` : url,
                })
            }
        })

        return articles
    } catch (error) {
        console.error('Error fetching HN front page:', error)
        return []
    }
}

export { fetchHNFrontPage, type HNArticle }
