import DataUtils from './DataUtils.mjs'
import {IBookValues} from './ScrapeUtils.mjs'

export default class PostUtils {
    static async buildPayload(values: IBookValues): Promise<IPostData | undefined> {
        if (!values.title || !values.link || !values.bookId) {
            console.warn(`Missing value, title: ${values.title}, link: ${values.link}, bookId: ${values.bookId}`)
            return undefined
        }
        /*
        TODO
         If seriesId
            If series is already posted, if so get thread ID and update, appending this book to the list of books in the post.
                Up to 10 books can be posted as separate embeds.
                Up to 25 books can be posted as separate fields (per embed)
            Else post new series thread, takes description and image from the first book posted
         Else bookId
            If book has already been posted, if so update thread
            Else post new book thread
         */

        // Load existing posts
        const bookList = await DataUtils.loadBooks(values.bookId)

        // Check if book and/or series exists
        const booksInSeries = bookList.filter((post) => {
            return post?.seriesId && post.seriesId.length > 0 && post.seriesId === values.seriesId
        })
        const bookExists = bookList.find((post) => {
            return post?.bookId && post.bookId.length > 0 && post.bookId === values.bookId
        })
        const seriesExists = booksInSeries.length > 0
        console.log('buildPayload', {booksInSeries: booksInSeries.length, bookExists: !!bookExists, seriesExists})

        // Append book post if needed
        if (!bookExists) {
            bookList.push(values)
        }

        let content = ''
        let postId = ''
        let threadName = ''
        let embeds: IPostEmbed[] = []
        if (values.seriesId?.length && values.series?.length) {
            // Series
            if (seriesExists) {
                // Update current post
                postId = booksInSeries[0].postId ?? ''
                
                booksInSeries.push(values)
                booksInSeries.sort((a, b) => {
                    return (a.bookNumber ?? 0) - (b.bookNumber ?? 0)
                })
                if (booksInSeries.length > 10) {
                    // Books as fields
                    content = bookExists?.description ?? '' // Because book descriptions are hidden now
                    embeds = [this.renderEmbedWithBooks(booksInSeries)]
                } else {
                    // Books as embeds
                    content = 'This is a series of books.' // TODO: Progress values
                    embeds = booksInSeries.map((bookValues) => {
                        return this.renderBookAsEmbed(bookValues)
                    })
                }
            } else {
                // Create new post
                threadName = values.series
                content = `This is a series of books.` // TODO: Progress values
                embeds = [this.renderBookAsEmbed(values)]
            }
        } else {
            // Standalone book
            content = 'This is a standalone book.'
            embeds = [this.renderBookAsEmbed(values)]
            if (bookExists) {
                // Update current post
                postId = bookExists.postId ?? ''
            } else {
                threadName = values.title
            }
        }

        const postData: IPostData = {
            payload: {
                content,
                embeds
            }
        }
        console.log('buildPayload', {postId, threadName})
        if (postId) postData.id = postId // Edit post
        if (threadName) postData.payload.thread_name = threadName

        return postData
    }

    // region Full Size
    private static renderBookAsEmbed(values: IBookValues): IPostEmbed {
        return {
            title: this.buildTitle(values),
            description: this.decodeHtmlEntities(values.description ?? 'N/A'),
            url: values.link,
            thumbnail: {url: values.imageUrl ?? ''},
            fields: [this.renderBookAsField(values, '\u200b', true)]
        }
    }

    // endregion
    // region Minimized
    private static renderEmbedWithBooks(list: IBookValues[]): IPostEmbed {
        const values = list[0] // Use first book for description as that is used for series on the site.
        return {
            title: this.decodeHtmlEntities(values.series ?? 'N/A'),
            description: this.decodeHtmlEntities(values.description ?? 'N/A'),
            thumbnail: {url: values.imageUrl ?? ''},
            fields: this.renderBooksAsFields(list)
        }
    }

    private static renderBooksAsFields(list: IBookValues[]): IPostEmbedField[] {
        const fields: IPostEmbedField[] = []
        for (const values of list) {
            fields.push(this.renderBookAsField(values))
        }
        return fields
    }

    private static renderBookAsField(values: IBookValues, titleOverride: string = '', skipLink: boolean = false): IPostEmbedField {
        const link = skipLink ? '' : `**Link**: [Audible](<${values.link}>)`
        return this.renderField(
            titleOverride.length ? titleOverride : this.buildTitle(values),
            `
                    **Author(s)**: ${values.author ?? 'N/A'}
                    **Narrator(s)**: ${values.narrator ?? 'N/A'}
                    **Length**: ${values.runtime ?? 'N/A'}  
                    **Release Date**: ${values.releaseDate ?? 'N/A'}
                    **Categories**: ${values.categories ?? 'N/A'}
                    **Publisher**: ${values.publisher ?? 'N/A'}
                    **Abridged**: ${values.abridged ? 'Yes' : 'No'}
                    **Adult Content**: ${values.adult ? 'Yes' : 'No'}
                    ${link}
                `
        )
    }

    // endregion

    // region Generic
    private static renderField(name: string, value: string, inline: boolean = false): IPostEmbedField {
        return {name, value, inline}
    }

    private static renderRowBreakField(): IPostEmbedField {
        const char = '\u200b'
        return this.renderField(char, char)
    }

    private static buildTitle(values: IBookValues): string {
        const title = this.decodeHtmlEntities(values.title ?? '')
        if (values.bookNumber) {
            return `${title} (Book ${values.bookNumber})`
        }
        return `${title}`
    }

    // endregion

    static async post(data: IPostData): Promise<IPostResponse | undefined> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(
            `${root}post_webhook.php`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            }
        )
        if (response.ok) {
            return await response.json() as IPostResponse
        }
        return undefined
    }

    private static decodeHtmlEntities(text: string): string {
        const txt = document.createElement('textarea')
        txt.innerHTML = text
        return txt.value
    }
}

export interface IPostData {
    /** Add to update a post */
    id?: string
    payload: IPostContent
}

export interface IPostContent {
    content: string
    /** Add to create a new thread, required for forum channels. */
    thread_name?: string
    embeds: IPostEmbed[]
}

export interface IPostEmbed {
    title: string
    description: string
    url?: string
    thumbnail: {
        url: string
    }
    fields: IPostEmbedField[]
}

export interface IPostEmbedField {
    name: string
    value: string
    inline: boolean
}

export interface IPostResponse {
    type: number
    content: string
    mentions: any[]
    mention_roles: any[],
    attachments: any[],
    embeds: IPostResponseEmbed [],
    timestamp: string
    edited_timestamp: any | null
    flags: number
    components: any[],
    id: string
    channel_id: string
    author: {
        id: string
        username: string
        avatar: any | null,
        discriminator: string
        public_flags: number
        flags: number
        bot: boolean
        global_name: any | null
        clan: any | null
        primary_guild: any | null
    },
    pinned: boolean
    mention_everyone: boolean
    tts: boolean
    webhook_id: string
    position: number
}

export interface IPostResponseEmbed {
    type: string
    url: string
    title: string
    description: string
    fields: IPostResponseEmbedField[],
    thumbnail: {
        url: string
        proxy_url: string
        width: number
        height: number
        flags: number
    }
}

export interface IPostResponseEmbedField {
    name: string
    value: string
    inline: boolean
}