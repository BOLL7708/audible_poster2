import {IBookValues} from './ScrapeUtils.mjs'

export default class FileUtils {
    static _cache: IPost[] = []

    /**
     * Will load the list from disk or return the cache if already loaded.
     */
    static async loadList(): Promise<IPost[]> {
        if (this._cache.length) return JSON.parse(JSON.stringify(this._cache))

        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(`${root}data_load.php`)
        if (response.ok) {
            const result = await response.json()
            if (Array.isArray(result)) {
                this._cache = result
                return result
            }
        } else {
            await this.saveList([])
        }
        return []
    }

    /**
     * Will set the cache to this list value and then write it to disk.
     * @param list
     */
    static async saveList(list: IPost[]): Promise<boolean> {
        this._cache = list
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(
            `${root}data_save.php`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(list)
            }
        )
        return response.ok
    }

    /**
     * Will append the list with a new entry, or update it if it already exists.
     * @param id
     * @param values
     */
    static async savePost(id: string, values: IBookValues): Promise<boolean> {
        const list = await this.loadList()
        let wasUpdated = false
        for (const [i, item] of list.entries()) {
            console.log({values, item})
            if (values.bookId === item.values.bookId) { // We're updating an existing book
                // TODO
                //  1. Delete empty values from new values
                //  2. Map new values on top of old values
                //  3. Save
                item.values = values
                list[i] = item
                wasUpdated = true
            }
        }
        if(!wasUpdated) {
            list.push({postId: id, values})
        }
        return await this.saveList(list)
    }
}

export interface IPost {
    postId: string
    values: IBookValues
}