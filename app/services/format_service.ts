export class FormatService {
    static exchangeRates: Record<string, number> = {
        JPY: 1,
        USD: 0.0067,
        INR: 0.55,
        EUR: 0.0061,
    }

    static convert(value: number, toCurrency: string) {
        const rate = this.exchangeRates[toCurrency] ?? 1
        return value * rate
    }
    static currency(value: number, locale: string, currency?: string) {
        if (!currency) {
            if (locale.startsWith('en-IN') || locale === 'hi') currency = 'INR'
            else if (locale.startsWith('en')) currency = 'USD'
            else if (locale.startsWith('fr')) currency = 'EUR'
            else if (locale.startsWith('ja')) currency = 'JPY'
            else currency = 'USD'
        }

        const convertedValue = this.convert(value, currency)

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol',
        }).format(convertedValue)
    }

    static number(value: number, locale: string) {
        return new Intl.NumberFormat(locale).format(value)
    }

    static date(value: any, locale: string) {
        const date = value?.toJSDate ? value.toJSDate() : value
        return new Intl.DateTimeFormat(locale).format(date)
    }
}
