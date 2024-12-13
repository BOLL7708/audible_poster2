import {IBookValues} from './ScrapeUtils.mjs'

export default class PostUtils {

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
        if(response.ok) {
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