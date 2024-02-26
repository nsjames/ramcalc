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
    return (quote / base) * bytes;
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

