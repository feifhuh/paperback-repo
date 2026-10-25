import {
    Source,
    Manga,
    Chapter,
    Page,
    SourceManga,
    Request,
    Response,
    SearchRequest,
    PagedResults
} from '@paperback/types'

export class KomiicSource extends Source {
    private baseUrl = 'https://komiic.com'
    private apiUrl = 'https://komiic.com/api/query'

    // 1. 搜尋漫畫 (Search Manga)
    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const searchTitle = query.title ?? ''
        
        // GraphQL 查詢語法（原理跟 Python requests.post 一模一樣）
        const gqlQuery = {
            query: `
                query searchManga($title: String!) {
                    mangaByTitle(title: $title) {
                        id
                        title
                        cover
                    }
                }
            `,
            variables: { title: searchTitle }
        }

        const request: Request = {
            url: this.apiUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(gqlQuery)
        }

        const response = await this.requestManager.schedule(request, 1)
        const json = JSON.parse(response.data)
        const mangas: SourceManga[] = []

        for (const item of json.data.mangaByTitle || []) {
            mangas.push(
                createSourceManga({
                    mangaId: item.id,
                    mangaInfo: createMangaInfo({
                        title: item.title,
                        image: item.cover,
                        status: 'Ongoing'
                    })
                })
            )
        }

        return createPagedResults({ results: mangas })
    }

    // 2. 抓取漫畫章節 (Get Chapters)
    async getChapters(mangaId: string): Promise<Chapter[]> {
        const gqlQuery = {
            query: `
                query getChapters($mangaId: ID!) {
                    chaptersByMangaId(mangaId: $mangaId) {
                        id
                        serial
                        size
                    }
                }
            `,
            variables: { mangaId }
        }

        const request: Request = {
            url: this.apiUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(gqlQuery)
        }

        const response = await this.requestManager.schedule(request, 1)
        const json = JSON.parse(response.data)
        const chapters: Chapter[] = []

        for (const chap of json.data.chaptersByMangaId || []) {
            chapters.push(
                createChapter({
                    id: chap.id,
                    mangaId: mangaId,
                    chapNum: parseFloat(chap.serial) || 0,
                    langCode: 'zh-hant'
                })
            )
        }

        return chapters
    }

    // 3. 抓取章節內的圖片 (Get Chapter Pages)
    async getPageDetails(mangaId: string, chapterId: string): Promise<Page[]> {
        const gqlQuery = {
            query: `
                query getImages($chapterId: ID!) {
                    imagesByChapterId(chapterId: $chapterId) {
                        kid
                        height
                        width
                    }
                }
            `,
            variables: { chapterId }
        }

        const request: Request = {
            url: this.apiUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(gqlQuery)
        }

        const response = await this.requestManager.schedule(request, 1)
        const json = JSON.parse(response.data)
        const pages: Page[] = []

        let index = 0
        for (const img of json.data.imagesByChapterId || []) {
            // Komiic 的圖片 CDN 網址建構
            const imageUrl = `https://cdn.komiic.com/images/${img.kid}`
            pages.push(
                createPage({
                    id: String(index++),
                    imageUrl: imageUrl
                })
            )
        }

        return pages
    }
}
