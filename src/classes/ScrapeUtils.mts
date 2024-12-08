export default class ScrapeUtils {
    static async fetchAndParse(url: string): Promise<IBookValues | undefined> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(`${root}fetch_page.php?url=` + encodeURIComponent(url))
        if (response.ok) {
            const text = await response.text()
            // TODO: Do all the parsing of the page here.
        } else {
            console.warn(response.statusText, response.status)
        }
    }
}

export interface IBookValues {
    link: string
    title: string
    description: string
    imageUrl: string
    author: string
    narrator: string
    series: string
    runtime: string
}