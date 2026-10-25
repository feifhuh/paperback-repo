import {
    Source,
    Manga,
    Chapter,
    Page,
    SearchRequest,
    PagedResults,
    SourceManga,
    Request,
    Response
} from 'paperback-extensions-common'

export class KomiicSource extends Source {
    private baseUrl = 'https://komiic.com'
    private apiUrl = 'https://komiic.com/api/query'

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const searchTitle = query.title ?? ''
        
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

        const request = createRequestObject({
            url: this.apiUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(gqlQuery)
        })

        const response = await this.requestManager.schedule(request, 1)
        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        const mangas: SourceManga[] = []

        for (const item of json.data?.mangaByTitle || []) {
            mangas.push(
                createSourceManga({
                    id: item.id,
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

        const request = createRequestObject({
            url: this.apiUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(gqlQuery)
        })

        const response = await this.requestManager.schedule(request, 1)
        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        const chapters: Chapter[] = []

        for (const chap of json.data?.chaptersByMangaId || []) {
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

        const request = createRequestObject({
            url: this.apiUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(gqlQuery)
        })

        const response = await this.requestManager.schedule(request, 1)
        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        const pages: Page[] = []

        let index = 0
        for (const img of json.data?.imagesByChapterId || []) {
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
