import * as cheerio from 'cheerio'

async function getHNFrontPage(): Promise<string> {
    try {
        const response = await fetch('https://news.ycombinator.com')
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const html = await response.text()
        return html
    } catch (error) {
        console.error('Error fetching HN front page:', error)
        throw error
    }
}

interface HNArticle {
    title: string
    url: string
}

export async function extractHNArticles(): Promise<HNArticle[]> {
    try {
        const html = await getHNFrontPage()
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
    } catch (error) {
        console.error('Error extracting HN articles:', error)
        throw error
    }
}
