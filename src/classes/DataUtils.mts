import {IBookValues} from './ScrapeUtils.mjs'

export enum EBookIdType {
    Book,
    Series,
    Post
}

export default class DataUtils {
    /**
     * Will load books from the database.
     */
    static async loadBooks(id: string = '', type: EBookIdType): Promise<IBookValues[]> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        let field = ''
        switch(type) {
            case EBookIdType.Book:
                field = 'bookId'
                break
            case EBookIdType.Series:
                field = 'seriesId'
                break
            case EBookIdType.Post:
                field = 'postId'
                break
        }
        const query = id.length > 0
            ? `?${field}=${id}`
            : ''
        const url = `${root}data_load.php${query}`
        const response = await fetch(url)
        if (response.ok) {
            const result = await response.json() as IBookValues[]
            if (Array.isArray(result)) {
                return result
            }
        }
        return []
    }

    /**
     * Will set the cache to this list value and then write it to disk.
     * @param values
     */
    static async saveOrUpdateBook(values: IBookValues): Promise<boolean> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(
            `${root}data_save.php`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(values)
            }
        )
        return response.ok
    }
}