const { bidCalculator } = require('../js/app.js');

function createCalc(config, bids) {
    config = config || {};
    bids = bids || [];
    const calc = bidCalculator();
    Object.assign(calc.config, config);
    bids.forEach(function(b, i) {
        calc.bids.push({ id: i + 1, name: b.name, price: b.price });
    });
    calc.bidIdCounter = bids.length;
    return calc;
}

module.exports = { createCalc };
