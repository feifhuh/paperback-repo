import {
    Source,
    Chapter,
    SearchRequest,
    PagedResults,
    SourceManga,
    LanguageCode,
    MangaStatus,
    RequestManager
} from 'paperback-extensions-common'

export class KomiicSource extends Source {
    requestManager: RequestManager = createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000
    })

    private apiUrl = 'https://komiic.com/api/query'

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        return createSourceManga({
            id: mangaId,
            mangaInfo: createMangaInfo({
                titles: ['Komiic Manga'],
                image: 'https://komiic.com/favicon.ico',
                status: MangaStatus.ONGOING
            })
        })
    }

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
        const tiles: any[] = []

        for (const item of json.data?.mangaByTitle || []) {
            tiles.push(
                createMangaTile({
                    id: item.id,
                    title: createIconText({ text: item.title }),
                    image: item.cover
                })
            )
        }

        return createPagedResults({ results: tiles })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const gqlQuery = {
            query: `
                query getChapters($mangaId: ID!) {
                    chaptersByMangaId(mangaId: $mangaId) {
                        id
                        serial
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
                    langCode: LanguageCode.CHINEESE
                })
            )
        }

        return chapters
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<any> {
        const gqlQuery = {
            query: `
                query getImages($chapterId: ID!) {
                    imagesByChapterId(chapterId: $chapterId) {
                        kid
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
        const pages: string[] = []

        for (const img of json.data?.imagesByChapterId || []) {
            pages.push(`https://cdn.komiic.com/images/${img.kid}`)
        }

        return createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
            longStrip: false
        })
    }
}
