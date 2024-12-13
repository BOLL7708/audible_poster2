export default class ScrapeUtils {
    static async fetchAndParse(url: string): Promise<IBookValues | undefined> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(`${root}fetch_page.php?url=` + encodeURIComponent(url))
        if (response.ok) {
            let text = await response.text()
            text = text.replace(/\n/g, '')
            console.log('text length', text.length, text)
            const bookValues: IBookValues = {}
            this.getOgTags(text, bookValues)
            this.getImageUrl(text, bookValues)
            // TODO: The below values no longer exists on the page we load in the background, probably injected client side.
            // this.getAuthor(text, bookValues)
            // this.getNarrator(text, bookValues)
            // this.getSeries(text, bookValues)
            // this.getLength(text, bookValues)
            console.log(bookValues)
            return bookValues
        } else {
            console.warn(response.statusText, response.status)
        }
    }

    static getOgTags(text: string, bookValues: IBookValues): IBookValues {
        const matches = text.matchAll(/<meta property="og:(\w*?)" content="(.*?)" \/>/gi)
        for(const [_, tag, value] of Array.from(matches)) {
            if(tag && value) {
                switch(tag) {
                    case 'title': bookValues.title = value; break
                    case 'description': bookValues.description = value.replace('Check out this great listen on Audible.com.', ''); break
                    case 'url': bookValues.link = value; break
                    case 'image': bookValues.bannerUrl = value; break
                    default: console.log(`Skipping: ${tag}->${value} `)
                }
            }
        }
        return bookValues
    }

    static getImageUrl(text: string, bookValues: IBookValues): IBookValues {
        const match = text.match(/"(https:\/\/m.media-amazon.com\/images\/I\/[^%,]+?\._SL500_\.jpg)"/i)
        console.log({image: match})
        if(match && match.length >= 2) {
            bookValues.imageUrl = match[1]
        }
        return bookValues
    }

    static getAuthor(text: string, bookValues: IBookValues): IBookValues {
        const match = text.match(/authorLabel".*?>.*?by:.*?<a.*?>(.*?)<\/a>/i)
        console.log({author: match})
        if(match && match.length >= 2) {
            bookValues.author = match[1]
        }
        return bookValues
    }

    static getNarrator(text: string, bookValues: IBookValues): IBookValues {
        const match = text.match(/narratorLabel".*?>(.*?)<\/li>/i)
        console.log({narrator: match})
        if(match && match.length >= 2) {
            bookValues.narrator = match[1]
        }
        return bookValues
    }

    static getSeries(text: string, bookValues: IBookValues): IBookValues {
        const match = text.match(/seriesLabel".*?>(.*?)<\/li>/i)
        console.log({series: match})
        if(match && match.length >= 2) {
            bookValues.series = match[1]
        }
        return bookValues
    }

    static getLength(text: string, bookValues: IBookValues): IBookValues {
        const match = text.match(/runtimeLabel".*?Length:(.*?)<\/li>/i)
        console.log({runtime: match})
        if(match && match.length >= 2) {
            bookValues.runtime = match[1]
        }
        return bookValues
    }
}

export interface IBookValues {
    link?: string
    title?: string
    description?: string
    bannerUrl?: string
    imageUrl?: string
    author?: string
    narrator?: string
    series?: string
    runtime?: string
}