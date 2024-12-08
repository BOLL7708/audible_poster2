export default class FileUtils {
    static async loadList(): Promise<IPost[]> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(`${root}data_load.php`)
        if (response.ok) {
            return await response.json()
        } else {
            return []
        }
    }

    static async saveList(list: IPost[]): Promise<boolean> {
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
}

export interface IPost {
    post: string
    link: string
}