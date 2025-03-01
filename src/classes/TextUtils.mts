export default class TextUtils
{
    static renderEmojiNumber(number: number): string {
        const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
        return number
            .toString()
            .split('')
            .map(digit => emojis[Number.parseInt(digit)])
            .join('')
    }
    static timeStrFromMinutes(minutes: number): string {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return `${h}h ${m}m`
    }
}