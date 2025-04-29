import AuthUtils from './AuthUtils.mjs'
import DataUtils, {EBookIdType} from './DataUtils.mjs'
import {IBookValues} from './ScrapeUtils.mjs'
import {IBookDbValues} from './DataUtils.mjs'
import ValueUtils from './SharedUtils/ValueUtils.mjs'
import TextUtils from './TextUtils.mjs'

export enum EChannel {
    Forum = 'forum',
    Alert = 'alert'
}

export default class PostUtils {
    // region Forum Post
    static async buildForumPayload(values: IBookValues): Promise<IPostData | undefined> {
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
            // region Series
            if (seriesAlreadyContainsBooks) {
                // Update current post
                postId = booksInSeries[0].postId ?? ''

                if (seriesAlreadyContainsBooks && !bookAlreadyExists) {
                    // Append new book to include it in post
                    booksInSeries.push(values)
                } else {
                    // Update book in series or else it will use old data
                    const index = booksInSeries.findIndex((book) => book.bookId === values.bookId)
                    if (index > -1) {
                        booksInSeries[index] = values
                    }
                }

                booksInSeries.sort((a, b) => {
                    return (a.bookNumber ?? 0) - (b.bookNumber ?? 0)
                })
                let sizeOfEmbeds = 0
                if (booksInSeries.length > 10) {
                    // Books as fields, as a message can only have 10 embeds.
                    content = this.buildSeriesDescription(booksInSeries, true)
                    embeds = [this.renderEmbedWithBooks(booksInSeries)]
                } else {
                    // Books as embeds, as a message can fit up to 10 embeds.
                    content = this.buildSeriesDescription(booksInSeries, false)
                    embeds = booksInSeries.map((bookValues) => {
                        return this.renderBookAsEmbed(bookValues, EPostDescriptionType.Description)
                    })
                    // If the message is too large, we will again fall back to fields.
                    sizeOfEmbeds = this.getSizeOfEmbeds(embeds)
                    if (sizeOfEmbeds > 6000) {
                        content = this.buildSeriesDescription(booksInSeries, true)
                        embeds = [this.renderEmbedWithBooks(booksInSeries)]
                    }
                }
                // If the message is still too large, we fall back to minified fields.
                sizeOfEmbeds = this.getSizeOfEmbeds(embeds)
                if (sizeOfEmbeds > 6000) {
                    content = this.buildSeriesDescription(booksInSeries, true)
                    embeds = [this.renderEmbedWithBooks(booksInSeries, true)]
                }
                // TODO: If still too large, think of just making a summary post with statistics with link to the series as a whole.
            } else {
                // Create new post
                threadName = values.series ?? 'Untitled'
                content = this.buildSeriesDescription(booksInSeries, false)
                embeds = [this.renderBookAsEmbed(values, EPostDescriptionType.Description)]
            }
            // endregion
        } else {
            // region Standalone book
            content = ':information_source: ' + this.decodeHtmlEntities(values.description ?? 'No description')
            embeds = [this.renderBookAsEmbed(values, EPostDescriptionType.Subtitle)]
            if (bookAlreadyExists) {
                // Update current post
                postId = storedBookValues.postId ?? ''
            } else {
                // New post
                threadName = values.title ?? 'Untitled'
            }
            // endregion
        }

        const postData: IPostData = {
            payload: {
                content,
                embeds
            }
        }
        console.log('buildForumPayload', {postId, threadName})
        if (postId) postData.id = postId // Edit post
        if (threadName) postData.payload.thread_name = threadName

        return postData
    }

    // region Full Size
    private static renderBookAsEmbed(values: IBookValues, descriptionType: EPostDescriptionType): IPostEmbed {
        const postEmbed: IPostEmbed = {
            title: this.buildTitle(values),
            url: values.link,
            thumbnail: {url: values.imageUrl ?? ''},
            fields: [this.renderBookAsField(values, '\u200b', true)]
        }
        switch (descriptionType) {
            case EPostDescriptionType.Description:
                postEmbed.description = ':information_source: ' + this.decodeHtmlEntities(values.description ?? 'No description.')
                break
            case EPostDescriptionType.Subtitle:
                postEmbed.description = this.decodeHtmlEntities(values.subtitle ?? '')
                break
        }
        return postEmbed
    }

    // endregion
    // region Minimized
    private static renderEmbedWithBooks(list: IBookDbValues[], minified: boolean = false): IPostEmbed {
        const values = list[0] // Use first book for description as that is used for series on the site.
        return {
            title: this.decodeHtmlEntities(values.series ?? 'N/A'),
            // description: this.decodeHtmlEntities(values.description ?? 'N/A'),
            thumbnail: {url: values.imageUrl ?? ''},
            fields: this.renderBooksAsFields(list, minified)
        }
    }

    private static renderBooksAsFields(list: IBookDbValues[], minified: boolean = false): IPostEmbedField[] {
        const fields: IPostEmbedField[] = []
        for (const values of list) {
            fields.push(this.renderBookAsField(values, '', false, minified))
        }
        return fields
    }

    private static renderBookAsField(values: IBookDbValues, titleOverride: string = '', skipLink: boolean = false, minified: boolean = false): IPostEmbedField {
        const separator = ' → '
        const score = values.reviewScore && values.reviewScore > 0 ? `:star: Score${separator}**${values.reviewScore}**\n` : ''
        const dates = values.listenStart && values.listenEnd
            ? `:calendar: Finished ${separator}**${values.listenEnd} after ${ValueUtils.daysBetween(new Date(values.listenStart), new Date(values.listenEnd))} day(s)**\n`
            : values.listenStart
                ? `:calendar: Unfinished, started ${separator}**${values.listenStart}**\n`
                : ''
        const link = skipLink ? '' : `:link: Link${separator}**[Audible](<${values.link}>)**\n`
        return this.renderField(
            titleOverride.length ? titleOverride : this.buildTitle(values),
            minified ? `${score}${dates}${link}` : `
:writing_hand: Author(s)${separator}**${values.author ?? 'N/A'}**
:speaking_head: Narrator(s)${separator}**${values.narrator ?? 'N/A'}**
:hourglass: Length${separator}**${values.runtimeHours ?? 0}h ${values.runtimeMinutes ?? 0}m**
:date: Release Date${separator}**${values.releaseDate ?? 'N/A'}**
:books: Categories${separator}**${values.categories ?? 'N/A'}**
:man_office_worker: Publisher${separator}**${values.publisher ?? 'N/A'}**
:bridge_at_night: Abridged${separator}**${values.abridged ? 'Yes' : 'No'}**
:dancer: Adult Content${separator}**${values.adult ? 'Yes' : 'No'}**
${score}${dates}${link}
                `
        )
    }

    // endregion
    // endregion

    // region Alert Post
    public static buildAlertPayload(isStart: boolean, values: IBookDbValues): IPostData|undefined {
        // TODO: Build a localStorage config solution so we can set a server ID and include post links in these alerts.
        let content: string|undefined
        const series = values.series ? `${values.series}` : 'N/A'
        if (isStart && !values.postStartId && values.listenStart) {
            content = `
# Started: ${values.title}
Series: ${series}
Date: ${values.listenStart}
`
        } else if(!isStart && !values.postEndId && values.listenEnd) {
            content = `
# Finished: ${values.title}
Series: ${series}
Date: ${values.listenEnd}
`
        }
        return content ? {
            payload: {
                content,
                username: values.title,
                avatar_url: values.imageUrl
            },
        } : undefined
    }
    // endregion

    // region Generic
    private static renderField(name: string, value: string, inline: boolean = false): IPostEmbedField {
        return {name, value, inline}
    }

    private static buildTitle(values: IBookValues): string {
        const title = this.decodeHtmlEntities(values.title ?? '')
        if (values.bookNumber) {
            const bookNr = TextUtils.renderEmojiNumber(values.bookNumber)
            return `${bookNr} ${title} `
        }
        return `${title}`
    }

    // endregion

    static async post(data: IPostData, channel: EChannel): Promise<IPostResponse | undefined> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const init = AuthUtils.getInit()
        init.method = 'POST'
        const headers = new Headers(init.headers)
        headers.set('Content-Type', 'application/json')
        init.headers = headers
        init.body = JSON.stringify(data)
        const response = await fetch(
            `${root}post_webhook.php?channel=${channel}`,
            init
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

    private static getSizeOfEmbeds(embeds: IPostEmbed[]): number {
        return embeds.reduce((acc, embed): number => {
                const fieldLength = embed.fields.reduce((acc, field): number => {
                    return acc + field.name.length + field.value.length
                }, 0)
                return acc + embed.title.length + (embed.description?.length ?? 0) + fieldLength
            }, 0)
    }

    private static buildSeriesDescription(books: IBookValues[], includeDescription: boolean): string {
        const components: string[] = []

        const totalMinutes = books.reduce(
            (acc, book) => {
                return (book.runtimeHours ?? 0) * 60 + (book.runtimeMinutes ?? 0) + acc
            },
            0
        )
        const timeStr = TextUtils.timeStrFromMinutes(totalMinutes)
        components.push(
`:checkered_flag: Number of finished books: **${books.length}x**
:clock: Total listen time: **${timeStr}**
:book: Average time per book: **${TextUtils.timeStrFromMinutes(Math.round(totalMinutes / books.length))}**`
        )

        if (includeDescription) {
            const firstBook = books[0]
            components.push(':information_source: ' + this.decodeHtmlEntities(firstBook.description ?? 'No description available.'))
        }
        return components.join('\n\n')
    }
}

enum EPostDescriptionType {
    None,
    Description,
    Subtitle
}

export interface IPostData {
    /** Add to update a post */
    id?: string
    payload: IPostContent
}

export interface IPostContent {
    username?: string
    avatar_url?: string
    content: string
    /** Add to create a new thread, required for forum channels. */
    thread_name?: string
    embeds?: IPostEmbed[]
}

export interface IPostEmbed {
    title: string
    description?: string
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