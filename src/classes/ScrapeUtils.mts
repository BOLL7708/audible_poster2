import AuthUtils from './AuthUtils.mjs'

export default class ScrapeUtils {
    static async fetchAndParse(url: string): Promise<IBookValues | undefined> {
        const root = import.meta.env.VITE_ROOT_PHP ?? ''
        const response = await fetch(
            `${root}fetch_page.php?url=` + encodeURIComponent(url),
            AuthUtils.getInit()
        )
        if (response.ok) {
            let text = await response.text()
            text = text.replace(/\n/g, '')
            console.log('Fetched text length', text.length)
            let bookValues: IBookValues = {}
            bookValues = this.getOgTags(text, bookValues)
            bookValues = this.getProductMetadata(text, bookValues)
            bookValues = this.getTitleData(text, bookValues)
            bookValues = this.getSlotData(text, bookValues)
            bookValues = this.getDigitalData(text, bookValues)
            console.log('Done with fetching and parsing', bookValues)
            return bookValues
        } else {
            console.warn(response.statusText, response.status)
        }
    }

    static getOgTags(text: string, bookValues: IBookValues): IBookValues {
        const newBookValues: IBookValues = {}
        const matches = text.matchAll(/<meta property="og:(\w*?)" content="(.*?)" \/>/gi)
        for(const [_, tag, value] of Array.from(matches)) {
            if(tag && value) {
                switch(tag) {
                    case 'title': newBookValues.title = value; break
                    case 'description': newBookValues.description = value.replace('Check out this great listen on Audible.com.', ''); break
                    case 'url': newBookValues.link = value; break
                    case 'image': newBookValues.bannerUrl = value; break
                    default: // console.log(`Skipping: ${tag}->${value} `)
                }
            }
        }
        console.log('OgTagDataRaw', matches)
        console.table(newBookValues)
        return Object.assign({}, bookValues, newBookValues)
    }

    static getProductMetadata(text: string, bookValues: IBookValues): IBookValues {
        const newBookValues: IBookValues = {}
        const matches = [...text.matchAll(/<adbl-product-metadata.*?type="application\/json">(.*?)<\/script>/isg)]
        let metadata: IProductMetadata = {}
        if(matches) {
            for(const match of matches) {
                const json = match[1]
                try {
                    const jsonData = JSON.parse(json)
                    if(jsonData) {
                        metadata = Object.assign({}, metadata, jsonData)
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        }
        if(metadata.authors?.length) newBookValues.author = metadata.authors.map((author)=>{ return author.name }).join(', ')
        if(metadata.narrators?.length) newBookValues.narrator = metadata.narrators.map((author)=>{ return author.name }).join(', ')
        if(metadata.publisher) newBookValues.publisher = metadata.publisher.name
        if(metadata.releaseDate) {
            /* This exists, but we instead use the SlotData value as it is in the right format already, and this is not using a full year */
            // const dateObj = new Date()
            // const [date, month, year] = metadata.releaseDate.split('-')
            // dateObj.setDate(parseInt(date))
            // dateObj.setMonth(parseInt(month))
            // dateObj.setFullYear('20'+parseInt(year))
            // bookValues.releaseDate = dateObj.toISOString().split('T')[0]
        }
        if(metadata?.duration) {
            const hoursAndMinutesMatch = metadata.duration.match(/(\d+) hrs and (\d+) mins/i)
            if(hoursAndMinutesMatch) {
                newBookValues.runtimeHours = Number.parseInt(hoursAndMinutesMatch[1])
                newBookValues.runtimeMinutes = Number.parseInt(hoursAndMinutesMatch[2])
            } else { // Some books are exact hours, then the minutes are missing.
                const hoursMatch = metadata.duration.match(/(\d+) hrs/i)
                if(hoursMatch) {
                    newBookValues.runtimeHours = Number.parseInt(hoursMatch[1])
                    newBookValues.runtimeMinutes = 0
                }
            }
        }
        if(metadata?.series?.length) {
            const series = metadata.series[0]
            newBookValues.series = series.name
            newBookValues.seriesId = series.url
                .split('?')[0] // Remove query params
                .split('/') // Split on url params
                .pop() ?? '' // Get last url param
            newBookValues.seriesWebPath = series.url
        }
        if(metadata?.categories?.length) {
            newBookValues.categories = metadata.categories.map((category)=>{ return category.name }).join(', ')
        }
        if(metadata?.format) newBookValues.format = metadata.format
        console.log('ProductMetadata', metadata)
        console.table(newBookValues)
        return Object.assign({}, bookValues, newBookValues)
    }

    static getTitleData(text: string, bookValues: IBookValues): IBookValues {
        const newBookValues: IBookValues = {}
        const match = text.match(/<adbl-title-lockup.*?>.*?<h1 slot="title">(.*?)<\/h1>.*?<h2 slot="subtitle">(.*?)<\/h2>/is)
        if(match) {
            const title = match[1] ?? ''
            const subtitleWithBookNumber = match[2] ?? ''
            const subtitleArr = subtitleWithBookNumber.split(', ')
            // TODO: This fails for some books where the subtitle is not present. Cannot find any other place for it.
            const bookNumber = parseInt(subtitleArr.pop()?.replace(/\D*/gs, '') ?? '')
            if(title) newBookValues.title = title
            if(subtitleWithBookNumber) newBookValues.subtitle = subtitleWithBookNumber
            if(bookNumber) newBookValues.bookNumber = bookNumber
            console.log('TitleData', {title, subtitleWithBookNumber, bookNumber})
        }
        console.table(newBookValues)
        return Object.assign({}, bookValues, newBookValues)
    }

    static getSlotData(text: string, bookValues: IBookValues): IBookValues {
        const newBookValues: IBookValues = {}
        const matches = [...text.matchAll(/<script\W*?type="application\/ld\+json">(.*?)<\/script>/isg)]
        const audioBooks: ISlotDataAudioBook[] = []
        const products: ISlotDataProduct[] = []
        const breadcrumbLists: ISlotDataBreadcrumbList[] = []
        if(matches) {
            for(const match of matches) {
                const json = match[1]
                try {
                    const jsonData = JSON.parse(json)
                    if(jsonData && jsonData instanceof Array) {
                        for(const item of jsonData) {
                            const type = item['@type']
                            delete item['@context']
                            delete item['@type']
                            switch(type) {
                                case 'Audiobook': {
                                    audioBooks.push(item as ISlotDataAudioBook)
                                    break
                                }
                                case 'Product': {
                                    products.push(item as ISlotDataProduct)
                                    break
                                }
                                case 'BreadcrumbList': {
                                    breadcrumbLists.push(item as ISlotDataBreadcrumbList)
                                    break
                                }
                            }
                        }
                    } else {
                        /* Just catches some Audible organization data */
                        // console.log('JSON not array', jsonData)
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        }
        if(audioBooks.length) {
            const book = audioBooks[0]
            newBookValues.abridged = book.abridged == 'true'
            const hoursAndMinutesPtMatch = book.duration.match(/PT(\d+)H(\d+)M/i)
            if(hoursAndMinutesPtMatch) {
                newBookValues.runtimeHours = Number.parseInt(hoursAndMinutesPtMatch[1])
                newBookValues.runtimeMinutes = Number.parseInt(hoursAndMinutesPtMatch[2])
            } else { // If the minutes are missing we match for just the hours
                const hoursPtMatch = book.duration.match(/PT(\d+)h/i)
                if(hoursPtMatch) {
                    newBookValues.runtimeHours = Number.parseInt(hoursPtMatch[1])
                    newBookValues.runtimeMinutes = 0
                }
            }
            if(book.author.length) newBookValues.author = book.author.map((author)=>{return author.name}).join(', ')
            if(book.readBy.length) newBookValues.narrator = book.readBy.map((narrator)=>{return narrator.name}).join(', ')
            if(book.publisher) newBookValues.publisher = book.publisher
            if(book.name) newBookValues.title = book.name
            if(book.datePublished) newBookValues.releaseDate = book.datePublished
            if(book.inLanguage) newBookValues.language = book.inLanguage
            if(book.image) newBookValues.imageUrl = book.image
            // if(book.bookFormat) newBookValues.format = book.bookFormat /* The one in ProductMeta looks nicer */
        }
        if(products.length) {
            const product = products[0]
            if(product.brand) newBookValues.publisher = product.brand
            if(product.image) newBookValues.imageUrl = product.image
            if(product.name) newBookValues.title = product.name
            if(product.productID) newBookValues.bookId = product.productID
        }
        if(breadcrumbLists.length) {
            const breadcrumbList = breadcrumbLists[0]
            newBookValues.website = breadcrumbList.itemListElement[0]?.item['@id'] ?? ''
        }
        console.log('SlotData', {audioBooks, products, breadcrumbLists})
        console.table(newBookValues)
        return Object.assign({}, bookValues, newBookValues)
    }

    /**
     * This extracts JavaScript from the page, where the variable `digitalData` is defined, so we build a function that returns it and that is how we get the data.
     * @param text
     * @param bookValues
     */
    static getDigitalData(text: string, bookValues: IBookValues): IBookValues {
        const newBookValues: IBookValues = {}
        const match = text.match(/<!-- Begin DTM code -->.*?<script type="text\/javascript">\W*?(var\W*?digitalData\W*?=.*?)<\/script>/is)
        if(match) {
            const getData = new Function(match[1]+' return digitalData;')
            const digitalData: IDigitalData = getData()
            console.log('DigitalData', digitalData)
            const productInfo = digitalData.product[0]?.productInfo
            if(productInfo) {
                if(productInfo.productID) newBookValues.bookId = productInfo.productID
                if(productInfo.language) newBookValues.language = productInfo.language
                if(productInfo.authors?.length) newBookValues.author = productInfo.authors.map((author)=>{ return author.fullName }).join(', ')
                if(productInfo.narrators?.length) newBookValues.narrator = productInfo.narrators.join(', ')
                newBookValues.adult = productInfo.isAdultProduct
                if(productInfo.productName) newBookValues.title = productInfo.productName
                if(productInfo.publisherName) newBookValues.publisher = productInfo.publisherName
            }
        }
        console.table(newBookValues)
        return Object.assign({}, bookValues, newBookValues)
    }
}

export interface IBookValues {
    link?: string
    title?: string
    subtitle?: string
    language?: string
    description?: string
    bannerUrl?: string
    imageUrl?: string
    author?: string
    narrator?: string
    series?: string
    seriesId?: string
    seriesWebPath?: string
    bookNumber?: number
    bookId?: string
    runtimeHours?: number
    runtimeMinutes?: number
    publisher?: string
    releaseDate?: string
    adult?: boolean
    abridged?: boolean
    categories?: string
    format?: string
    website?: string
}

// region Product Metadata
export interface IProductMetadata {
    rating?: IProductMetadataRating,
    authors?: IProductMetadataPerson[]
    narrators?: IProductMetadataPerson[]
    duration?: string
    releaseDate?: string
    series?: IProductMetadataSeries[],
    format?: string
    publisher?: {
        name: string
        url: string
    },
    language?: string
    categories?: IProductMetadataCategory[]
    listeningEnhancements?: IProductMetadataListeningEnhancement[]

}

export interface IProductMetadataRating {
    count: number
    value: number
    url: string
}

export interface IProductMetadataPerson {
    name: string
    url: string
}

export interface IProductMetadataSeries {
    part: string
    name: string
    url: string
}

export interface IProductMetadataCategory {
    name: string
    url: string
}

export interface IProductMetadataListeningEnhancement {
    eventId: string
    icon: string
    variant: string
    label: string
}

// endregion

// region Slot Data
export interface ISlotDataAudioBook {
    bookFormat: string
    name: string
    description: string
    image: string
    abridged: string
    author: ISlotDataPerson[]
    readBy: ISlotDataPerson[]
    publisher: string
    datePublished: string
    inLanguage: string
    duration: string
    regionsAllowed: string[]
    aggregateRating: {
        '@type': string
        ratingValue: string
        ratingCount: string
    },
    offers: {
        '@type': string
        availability: string
        price: string
        priceCurrency: string
    }
}

export interface ISlotDataPerson {
    '@type': string
    name: string
}

export interface ISlotDataBreadcrumbList {
    itemListElement: ISlotDataBreadcrumbListItem[]
}

export interface ISlotDataBreadcrumbListItem {
    '@type': string
    position: number
    item: {
        '@id': string
        name: string
    }
}

export interface ISlotDataProduct {
    additionalType: string
    productID: string
    name: string
    image: string
    sku: string
    brand: string
    aggregateRating: {
        '@type': string
        ratingValue: string
        ratingCount: string
    },
    offers: {
        '@type': string
        availability: string
        price: string
        priceCurrency: string
    }
}

// region

// region Digital Data
export interface IDigitalData {
    page: IDigitalDataProductPage,
    product: IDigitalDataProduct[]
}

export interface IDigitalDataProductPage {
    category: {
        pageType?: string
        primaryCategory?: string
        subCategory1?: string
    }
    pageInfo: {
        pageName?: string
        contentType?: string
    }
}

export interface IDigitalDataProduct {
    productInfo: {
        isAvailable: boolean
        productID: string
        isInWishlist: boolean
        language: string
        productName: string
        narrationAccent: string
        contentDeliveryType: string
        isFree: boolean
        publisherName: string
        isPreorderable: boolean
        sku: string
        isAdultProduct: boolean
        authors: IDigitalDataProductAuthor[]
        narrators: string[]
    }
}

export interface IDigitalDataProductAuthor {
    fullName: string
    id: string
}

// endregion