import Constants from './Constants.mjs'
import DomUtils from './SharedUtils/DomUtils.mjs'
import ValueUtils from './SharedUtils/ValueUtils.mjs'

export default class AuthUtils {
    static getInit(baseHeaders: Record<string, string> = {}): RequestInit {
        return DomUtils.buildBearerAuth(localStorage.getItem(Constants.STORAGE_PASSWORD) ?? '', baseHeaders)
    }
    static async setPassword(password: string): Promise<void> {
        const hash = await ValueUtils.hashForPhp(password)
        localStorage.setItem(Constants.STORAGE_PASSWORD, hash)
    }
}