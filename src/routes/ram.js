import Decimal from 'decimal.js';

const rammarket = {
    base: {
        balance: {
            amount: 54 * 1024 * 1024 * 1024
        },
        weight: 0.5
    },
    quote: {
        balance: {
            amount: 4400000
        },
        weight: 0.41
    }
}

export function calculateRamPrice(base, quote, bytes) {
    // const connectorWeight = rammarket.quote.weight;
    //
    // return (quote / (connectorWeight * base)) * bytes;

    const baseBalance = new Decimal(base);
    const quoteBalance = new Decimal(quote);
    const amount = new Decimal(parseFloat(bytes));

    const R = baseBalance.minus(amount);
    const C = quoteBalance;
    const F = 1.0;

    return Number(C.times(Decimal.pow(amount.div(R).plus(1.0), F).minus(1.0)).toString());
}

export function getPriceMap(maxGbs) {
    let priceMap = [];

    // The EOS network started 64gb available, and 1,000,000 EOS in the RAM market
    // https://eos.eosq.eosnation.io/tx/ff7b77246a26da7c807facdc92bcebe257ff2e0b2b4ef0100cf4e109ecdf7344
    rammarket.base.balance.amount = maxGbs * 1024 * 1024 * 1024;
    rammarket.quote.balance.amount = 1000000;

    for(let i = 0; i <= maxGbs; i++) {
        const cost = calculateRamPrice(1024 * 1024 * 1024);
        rammarket.base.balance.amount -= 1024 * 1024 * 1024;
        rammarket.quote.balance.amount += cost;

        priceMap.push({
            cost: cost / (1024 * 1024 * 1024),
            costPerGb: cost,
            gbs: i
        });
    }

    return priceMap;
}

