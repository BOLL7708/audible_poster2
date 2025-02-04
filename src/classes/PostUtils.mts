import FileUtils from './FileUtils.mjs'
import {IBookValues} from './ScrapeUtils.mjs'

export default class PostUtils {
    static async buildPayload(values: IBookValues): Promise<IPostData | undefined> {
        if(!values.title || !values.link || !values.bookId) {
            console.warn(`Missing value, title: ${values.title}, link: ${values.link}, bookId: ${ values.bookId }`)
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
        const bookList = await FileUtils.loadList()

        // Check if book and/or series exists
        const booksInSeries = bookList.filter((post)=>{
            return post.values?.seriesId && post.values.seriesId.length > 0 && post.values.seriesId === values.seriesId
        })
        const bookExists = bookList.find((post)=>{
            return post.values?.bookId && post.values.bookId.length > 0 && post.values.bookId === values.bookId
        })
        const seriesExists = booksInSeries.length > 0

        // Append book post if needed
        const newPost = bookList.push({
            link: values.link,
            postId: '',
            values
        })
        if(!bookExists) {
            bookList.push(newPost)
        }

        let content = ''
        let postId = ''
        let threadName = ''
        let embeds: IPostEmbed[] = []
        if(values.seriesId?.length) {
            // Series
            if(seriesExists) {
                // Update current post
                postId = seriesExists.post
                const seriesValues = booksInSeries.map((post)=>{
                    return post.values
                })
                seriesValues.unshift(values)
                if(booksInSeries.length > 10) {
                    // Books as fields
                    content = bookExists.description // Because book descriptions are hidden now
                    embeds = this.renderEmbedWithBooks(seriesValues)
                } else {
                    // Books as embeds
                    content = 'This is a series of books.'
                    embeds = seriesValues.map((bookValues)=>{
                        return this.renderBookAsEmbed(bookValues)
                    })
                }
            } else {
                // Create new post
                threadName = values.series
                content = `This is a series of books.`
                embeds = [this.renderBookAsEmbed(values)]
            }
        } else {
            // Standalone book
            content = 'This is a standalone book.'
            embeds = [this.renderBookAsEmbed(values)]
            if(bookExists) {
                // Update current post
                postId = bookExists.post
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
        if(postId) postData.id = postId // Edit post
        if(threadName) postData.payload.thread_name = threadName

        return postData
    }

    // region Full Size
    private static renderBookAsEmbed(values: IBookValues): IPostEmbed {
        return {
            title: this.buildTitle(values),
            description: values.description,
            url: values.link,
            thumbnail: { url: values.imageUrl },
            fields: this.renderBookWithFields(values)
        }
    }

    private static renderBookWithFields(values: IBookValues): IPostEmbedField[] {
        return [
            this.renderField('Author(s)', values.author ?? 'N/A', true),
            this.renderField('Length', values.runtime ?? 'N/A', true),
            this.renderField('Narrator(s)', values.narrator ?? 'N/A', true),
            this.renderField('Release Date', values.releaseDate ?? 'N/A', true),
            this.renderField('Categories', values.categories ?? 'N/A', true),
            this.renderField('Publisher', values.publisher ?? 'N/A', true),
            this.renderField('Abridged', values.abridged ? 'Yes' : 'No', true),
            this.renderField('Adult Content', values.adult ? 'Yes' : 'No', true)
        ]
    }
    // endregion
    // region Minimized
    private static renderEmbedWithBooks(list: IBookValues[]): IPostEmbed {
        return {
            title: values.series,
            description: values.description,
            thumbnail: { url: values.imageUrl },
            fields: this.renderBooksAsFields(values)
        }
    }
    private static renderBooksAsFields(list: IBookValues[]): IPostEmbedField[] {
        const fields: IPostEmbedField[] = []
        for(const item of list) {
            fields.push(this.renderField(
                this.buildTitle(value),
                `
                    **Author(s)**: ${item.author ?? 'N/A'}
                    **Narrator(s)**: ${item.narrator ?? 'N/A'}
                    **Length**: ${item.runtime ?? 'N/A'}  
                    **Release Date**: ${item.releaseDate ?? 'N/A'}
                    **Categories**: ${item.categories ?? 'N/A'}
                    **Publisher**: ${item.publisher ?? 'N/A'}
                    **Abridged**: ${item.abridged ? 'Yes' : 'No'}
                    **Adult Content**: ${item.adult ? 'Yes' : 'No'}
                    **Link**: [Audible](<${item.link}>)
                `
            ))
        }
        return fields
    }
    // endregion

    // region Generic
    private static renderField(name: string, value: string, inline: boolean = false): IPostEmbedField {
        return { name, value, inline }
    }
    private static renderRowBreakField(): IPostEmbedField {
        const char = '\u200b'
        return this.renderField(char, char)
    }
    private static buildTitle(values: IBookValues): string {
        if(values.series) {
            if(values.bookNumber) {
                return `${values.series}, ${values.bookNumber} - ${values.title}`
            } else {
                return `${values.series} - ${values.title}`
            }
        } else {
            return `${values.title}`
        }
    }
    // endregion

    static async post(data: IPostData): Promise<string> {
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
            const result = await response.json()
            console.log(result)
        }
        return ''
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