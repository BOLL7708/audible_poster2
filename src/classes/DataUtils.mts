import {IBookValues} from './ScrapeUtils.mjs'

export enum EBookIdType {
    Book,
    Series,
    Post
}

export interface IBookDbValues extends IBookValues {
    /** Is returned when retrieved from the database */
    id?: number,
    /** Filled in by the system when forum thread is posted to Discord */
    postId?: string
    /** Filled in by the user or first post default by the page */
    listenStart?: string
    /** Filled in by the user or second post default by the page */
    listenEnd?: string
    /** Filled in by the system when alert is posted to Discord */
    postStartId?: string
    /** Filled in by the system when alert is posted to Discord */
    postEndId?: string
    /** Filled in by the user */
    reviewScore?: number
}

export default class DataUtils {
    /**
     * Will load books from the database.
     */
    static async loadBooks(id: string = '', type: EBookIdType): Promise<IBookDbValues[]> {
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
            const result = await response.json() as IBookDbValues[]
            if (Array.isArray(result)) {
                return result
            }
        }
        return []
    }

    /**
     * Will add or update the values in the database, if the book exists, only values that are non-empty will be updated.
     * @param values
     */
    static async saveOrUpdateBook(values: IBookDbValues): Promise<boolean> {
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