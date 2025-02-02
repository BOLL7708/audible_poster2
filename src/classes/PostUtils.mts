import {IBookValues} from './ScrapeUtils.mjs'
import FormattingUtils from './SharedUtils/FormattingUtils.mjs'

export default class PostUtils {
    static async buildPayload(values: IBookValues, existingId?: string): Promise<IPostData | undefined> {
        if (!values.title?.length || !values.link?.length) return undefined
        const description = values.description ?? 'No description.'
        // TODO: Previous solution had this as lines added to an array, I think to later be plugged into
        //  a JSON payload, which gets encoded into a text based message where we can append attachments.
        const content = `> **Link**: [Get the book](<${values.link}>)\n> **Description**: ${description}`
        const postData: IPostData = {
            payload: {content}
        }
        if(existingId) postData.id = existingId
        else postData.payload.thread_name = values.title

        // Add image attachment if we got one.
        // TODO: Enable this when we are ready to actually add attachments by providing the rest of the message
        //  in the right way, check original project or documentation for reference.
        if (false && values.imageUrl?.length) {
            const root = import.meta.env.VITE_ROOT_PHP ?? ''
            const response = await fetch(`${root}fetch_page.php?url=` + encodeURIComponent(values.imageUrl))
            if (response.ok()) {
                // TODO: Create and add attachment
                // Create
                const imageData = await response.text()

                // Add
                const extension = values.imageUrl.split(/\./g).pop().trim()
                const attachment: IPostAttachment = {
                    id: 0,
                    description: 'Cover image of the book',
                    filename: FormattingUtils.toFilename(title, undefined, '_cover', extension)
                }
                postData.attachments = [attachment]
            }
        }
        return postData
    }

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
    attachments?: IPostAttachment[]
}

export interface IPostContent {
    content: string
    /** Add to create a new thread, required for forum channels. */
    thread_name?: string
}

export interface IPostAttachment {
    id: number,
    description: string
    filename: string
}