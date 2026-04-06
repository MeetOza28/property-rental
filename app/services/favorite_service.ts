export class FavoriteService {
    // Your code here

    static escapeCSV(value: string) {
        if (!value) return ''

        const escaped = value.replace(/"/g, '""')

        if (escaped.search(/("|,|\n)/g) >= 0) {
            return `"${escaped}"`
        }

        return escaped
    }
}
