import DataUtils, {EBookIdType} from './DataUtils.mjs'
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

        // Load other books from series if possible
        const bookIsPartOfSeries = (values.seriesId?.length ?? 0) > 0
        const booksInSeries = bookIsPartOfSeries
            ? await DataUtils.loadBooks(values.seriesId, EBookIdType.Series)
            : []
        // Load book if it already exists
        const storedBookValues = (await DataUtils.loadBooks(values.bookId, EBookIdType.Book)).pop()
        const bookAlreadyExists = !!storedBookValues
        const seriesAlreadyContainsBooks = booksInSeries.length > 0

        let content = ''
        let postId = ''
        let threadName = ''
        let embeds: IPostEmbed[] = []
        if (bookIsPartOfSeries) {
            // Series
            if (seriesAlreadyContainsBooks) {
                // Update current post
                postId = booksInSeries[0].postId ?? ''

                if (seriesAlreadyContainsBooks && !bookAlreadyExists) {
                    // Append new book to include it in post
                    booksInSeries.push(values)
                }

                booksInSeries.sort((a, b) => {
                    return (a.bookNumber ?? 0) - (b.bookNumber ?? 0)
                })

                const firstBook = booksInSeries[0]
                if (booksInSeries.length > 10) {
                    // Books as fields, as a message can only have 10 embeds.
                    content = firstBook.description ?? 'No description.' // Because book descriptions are hidden now
                    embeds = [this.renderEmbedWithBooks(booksInSeries)]
                } else {
                    // Books as embeds, as a message can fit up to 10.
                    content = 'This is a series of books.' // TODO: Progress values
                    embeds = booksInSeries.map((bookValues) => {
                        return this.renderBookAsEmbed(bookValues)
                    })
                    const totalSize = this.getSizeOfPost(content, embeds)
                    if(totalSize > 6000) {
                        content = firstBook.description ?? 'No description.' // Because book descriptions are hidden now
                        embeds = [this.renderEmbedWithBooks(booksInSeries)]
                    }
                }
            } else {
                // Create new post
                threadName = values.series ?? 'N/A' // TODO: Total hours read? Also update this when editing?
                content = `This is a series of books.` // TODO: Progress values
                embeds = [this.renderBookAsEmbed(values)]
            }
        } else {
            // Standalone book
            content = 'This is a standalone book.'
            embeds = [this.renderBookAsEmbed(values)]
            if (bookAlreadyExists) {
                // Update current post
                postId = storedBookValues.postId ?? ''
            } else {
                // New post
                threadName = values.title ?? 'N/A'
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
        const separator = ' → '
        const link = skipLink ? '' : `Link${separator}[Audible](<${values.link}>)`
        return this.renderField(
            titleOverride.length ? titleOverride : this.buildTitle(values),
            `
                    Author(s)${separator}${values.author ?? 'N/A'}
                    Narrator(s)${separator}${values.narrator ?? 'N/A'}
                    Length${separator}${values.runtime ?? 'N/A'}  
                    Release Date${separator}${values.releaseDate ?? 'N/A'}
                    Categories${separator}${values.categories ?? 'N/A'}
                    Publisher${separator}${values.publisher ?? 'N/A'}
                    Abridged${separator}${values.abridged ? 'Yes' : 'No'}
                    Adult Content${separator}${values.adult ? 'Yes' : 'No'}
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

    private static getSizeOfPost(content: string, embeds: IPostEmbed[]): number {
        return content.length +
            embeds.reduce((acc, embed): number=>{
                const fieldLength = embed.fields.reduce((acc, field): number => {
                    return acc + field.name.length + field.value.length
                }, 0)
                return acc + embed.title.length + embed.description.length + fieldLength
            }, 0)
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