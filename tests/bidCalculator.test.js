import { describe, it, expect } from 'vitest';
import {
    checkValidity,
    getValidBids,
    getLowestValidPrice,
    getAverageValidPrice,
    calculateBaselinePrice,
    calculateDeviation,
    calculateDeduction,
    calculateScore,
    getSortedResults,
    defaultConfig
} from '../frontend-user/js/bidCalculatorCore.js';

describe('报价有效性判断 (checkValidity)', () => {
    describe('正常情况', () => {
        it('无限价时所有报价都有效', () => {
            const result = checkValidity(100, {});
            expect(result.valid).toBe(true);
            expect(result.reason).toBe('');
        });

        it('报价在上下限之间时有效', () => {
            const config = { maxPrice: 200, minPrice: 100 };
            const result = checkValidity(150, config);
            expect(result.valid).toBe(true);
            expect(result.reason).toBe('');
        });

        it('报价等于上限价时有效', () => {
            const config = { maxPrice: 200, minPrice: 100 };
            const result = checkValidity(200, config);
            expect(result.valid).toBe(true);
        });

        it('报价等于下限价时有效', () => {
            const config = { maxPrice: 200, minPrice: 100 };
            const result = checkValidity(100, config);
            expect(result.valid).toBe(true);
        });
    });

    describe('边界情况', () => {
        it('报价略高于上限价时无效', () => {
            const config = { maxPrice: 200 };
            const result = checkValidity(200.01, config);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('超上限');
        });

        it('报价略低于下限价时无效', () => {
            const config = { minPrice: 100 };
            const result = checkValidity(99.99, config);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('低下限');
        });

        it('报价为0时，无下限则有效', () => {
            const result = checkValidity(0, {});
            expect(result.valid).toBe(true);
        });
    });

    describe('异常情况', () => {
        it('只有上限价时，超出则无效', () => {
            const config = { maxPrice: 200 };
            expect(checkValidity(300, config).valid).toBe(false);
            expect(checkValidity(100, config).valid).toBe(true);
        });

        it('只有下限价时，低于则无效', () => {
            const config = { minPrice: 100 };
            expect(checkValidity(50, config).valid).toBe(false);
            expect(checkValidity(150, config).valid).toBe(true);
        });

        it('maxPrice为null时不判断上限', () => {
            const config = { maxPrice: null };
            const result = checkValidity(99999, config);
            expect(result.valid).toBe(true);
        });

        it('minPrice为null时不判断下限', () => {
            const config = { minPrice: null };
            const result = checkValidity(0.01, config);
            expect(result.valid).toBe(true);
        });

        it('maxPrice为空字符串时不判断上限', () => {
            const config = { maxPrice: '' };
            const result = checkValidity(99999, config);
            expect(result.valid).toBe(true);
        });

        it('minPrice为空字符串时不判断下限', () => {
            const config = { minPrice: '' };
            const result = checkValidity(0.01, config);
            expect(result.valid).toBe(true);
        });
    });
});

describe('有效报价筛选 (getValidBids)', () => {
    const bids = [
        { id: 1, name: 'A', price: 100 },
        { id: 2, name: 'B', price: 150 },
        { id: 3, name: 'C', price: 200 },
        { id: 4, name: 'D', price: 250 },
    ];

    it('无限价时返回所有报价', () => {
        const result = getValidBids(bids, {});
        expect(result.length).toBe(4);
    });

    it('正确筛选出有效报价', () => {
        const config = { maxPrice: 200, minPrice: 100 };
        const result = getValidBids(bids, config);
        expect(result.length).toBe(3);
        expect(result.map(b => b.name)).toEqual(['A', 'B', 'C']);
    });

    it('所有报价都无效时返回空数组', () => {
        const config = { maxPrice: 50 };
        const result = getValidBids(bids, config);
        expect(result.length).toBe(0);
    });

    it('空报价列表返回空数组', () => {
        const result = getValidBids([], {});
        expect(result.length).toBe(0);
    });
});

describe('最低有效报价 (getLowestValidPrice)', () => {
    const bids = [
        { id: 1, name: 'A', price: 100 },
        { id: 2, name: 'B', price: 150 },
        { id: 3, name: 'C', price: 80 },
    ];

    it('正确返回最低有效报价', () => {
        const result = getLowestValidPrice(bids, {});
        expect(result).toBe(80);
    });

    it('排除无效报价后取最低', () => {
        const config = { minPrice: 90 };
        const result = getLowestValidPrice(bids, config);
        expect(result).toBe(100);
    });

    it('无有效报价时返回null', () => {
        const config = { maxPrice: 50 };
        const result = getLowestValidPrice(bids, config);
        expect(result).toBeNull();
    });

    it('空列表返回null', () => {
        const result = getLowestValidPrice([], {});
        expect(result).toBeNull();
    });
});

describe('平均有效报价 (getAverageValidPrice)', () => {
    it('正确计算平均值', () => {
        const bids = [
            { id: 1, name: 'A', price: 100 },
            { id: 2, name: 'B', price: 200 },
            { id: 3, name: 'C', price: 300 },
        ];
        const result = getAverageValidPrice(bids, {});
        expect(result).toBe(200);
    });

    it('排除无效报价后计算平均', () => {
        const bids = [
            { id: 1, name: 'A', price: 100 },
            { id: 2, name: 'B', price: 200 },
            { id: 3, name: 'C', price: 300 },
            { id: 4, name: 'D', price: 400 },
        ];
        const config = { maxPrice: 300 };
        const result = getAverageValidPrice(bids, config);
        expect(result).toBe(200);
    });

    it('无有效报价时返回null', () => {
        const bids = [{ id: 1, name: 'A', price: 100 }];
        const config = { maxPrice: 50 };
        const result = getAverageValidPrice(bids, config);
        expect(result).toBeNull();
    });

    it('空列表返回null', () => {
        const result = getAverageValidPrice([], {});
        expect(result).toBeNull();
    });
});

describe('基准价计算 (calculateBaselinePrice)', () => {
    const bids = [
        { id: 1, name: 'A', price: 100 },
        { id: 2, name: 'B', price: 200 },
        { id: 3, name: 'C', price: 300 },
    ];

    describe('单低模式', () => {
        it('基准价等于最低有效报价', () => {
            const config = { mode: 'single' };
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBe(100);
        });

        it('排除无效报价后取最低', () => {
            const config = { mode: 'single', minPrice: 150 };
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBe(200);
        });

        it('无有效报价时返回null', () => {
            const config = { mode: 'single', maxPrice: 50 };
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBeNull();
        });
    });

    describe('双低模式', () => {
        it('按权重计算基准价 (40%最低价 + 60%平均价)', () => {
            const config = { mode: 'double', lowestWeight: 40 };
            const lowest = 100;
            const avg = 200;
            const expected = lowest * 0.4 + avg * 0.6;
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBeCloseTo(expected);
        });

        it('权重为0%时等于平均价', () => {
            const config = { mode: 'double', lowestWeight: 0 };
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBe(200);
        });

        it('权重为100%时等于最低价', () => {
            const config = { mode: 'double', lowestWeight: 100 };
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBe(100);
        });

        it('排除无效报价后计算', () => {
            const config = { mode: 'double', lowestWeight: 50, minPrice: 150 };
            const validBids = bids.filter(b => b.price >= 150);
            const lowest = Math.min(...validBids.map(b => b.price));
            const avg = validBids.reduce((s, b) => s + b.price, 0) / validBids.length;
            const expected = lowest * 0.5 + avg * 0.5;
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBeCloseTo(expected);
        });

        it('无有效报价时返回null', () => {
            const config = { mode: 'double', maxPrice: 50 };
            const result = calculateBaselinePrice(bids, config);
            expect(result).toBeNull();
        });
    });
});

describe('偏离率计算 (calculateDeviation)', () => {
    it('报价等于基准价时偏离率为0', () => {
        const result = calculateDeviation(100, 100);
        expect(result).toBe(0);
    });

    it('报价高于基准价时偏离率为正', () => {
        const result = calculateDeviation(110, 100);
        expect(result).toBe(10);
    });

    it('报价低于基准价时偏离率为负', () => {
        const result = calculateDeviation(90, 100);
        expect(result).toBe(-10);
    });

    it('正确计算偏离率百分比', () => {
        const result = calculateDeviation(125, 100);
        expect(result).toBe(25);
    });

    it('基准价为0时返回0', () => {
        const result = calculateDeviation(100, 0);
        expect(result).toBe(0);
    });

    it('基准价为null时返回0', () => {
        const result = calculateDeviation(100, null);
        expect(result).toBe(0);
    });
});

describe('扣分计算 (calculateDeduction)', () => {
    const baselinePrice = 100;

    describe('正常情况', () => {
        it('报价等于基准价时扣0分', () => {
            const config = { deductUp: 1, deductDown: 0.5 };
            const result = calculateDeduction(100, baselinePrice, config);
            expect(result).toBe(0);
        });

        it('上浮扣分：偏离1%扣deductUp分', () => {
            const config = { deductUp: 1.0 };
            const result = calculateDeduction(105, baselinePrice, config);
            expect(result).toBe(5);
        });

        it('下浮扣分：偏离1%扣deductDown分', () => {
            const config = { deductDown: 0.5 };
            const result = calculateDeduction(95, baselinePrice, config);
            expect(result).toBe(2.5);
        });
    });

    describe('边界情况', () => {
        it('下浮扣分为0时，低于基准价不扣分', () => {
            const config = { deductDown: 0 };
            const result = calculateDeduction(80, baselinePrice, config);
            expect(result).toBe(0);
        });

        it('上浮扣分为0时，高于基准价不扣分', () => {
            const config = { deductUp: 0 };
            const result = calculateDeduction(120, baselinePrice, config);
            expect(result).toBe(0);
        });
    });

    describe('异常情况', () => {
        it('基准价为null时扣0分', () => {
            const config = { deductUp: 1, deductDown: 0.5 };
            const result = calculateDeduction(100, null, config);
            expect(result).toBe(0);
        });

        it('基准价为0时扣0分', () => {
            const config = { deductUp: 1, deductDown: 0.5 };
            const result = calculateDeduction(100, 0, config);
            expect(result).toBe(0);
        });
    });
});

describe('最终得分计算 (calculateScore)', () => {
    const baselinePrice = 100;

    describe('正常情况', () => {
        it('报价等于基准价时得满分', () => {
            const config = { fullScore: 30, deductUp: 1, deductDown: 0.5 };
            const result = calculateScore(100, baselinePrice, config);
            expect(result).toBe(30);
        });

        it('上浮扣分后得分正确', () => {
            const config = { fullScore: 30, deductUp: 1.0 };
            const result = calculateScore(105, baselinePrice, config);
            expect(result).toBe(25);
        });

        it('下浮扣分后得分正确', () => {
            const config = { fullScore: 30, deductDown: 0.5 };
            const result = calculateScore(90, baselinePrice, config);
            expect(result).toBe(25);
        });
    });

    describe('边界情况', () => {
        it('得分不低于最低分限制', () => {
            const config = { fullScore: 30, minScore: 10, deductUp: 1 };
            const result = calculateScore(150, baselinePrice, config);
            expect(result).toBe(10);
        });

        it('得分不超过满分', () => {
            const config = { fullScore: 30, deductDown: -1 };
            const result = calculateScore(90, baselinePrice, config);
            expect(result).toBe(30);
        });

        it('刚好等于最低分时正常返回', () => {
            const config = { fullScore: 30, minScore: 10, deductUp: 1 };
            const result = calculateScore(120, baselinePrice, config);
            expect(result).toBe(10);
        });
    });

    describe('异常情况', () => {
        it('基准价为null时得0分', () => {
            const config = { fullScore: 30 };
            const result = calculateScore(100, null, config);
            expect(result).toBe(0);
        });

        it('基准价为0时得0分', () => {
            const config = { fullScore: 30 };
            const result = calculateScore(100, 0, config);
            expect(result).toBe(0);
        });
    });
});

describe('排序结果 (getSortedResults)', () => {
    const bids = [
        { id: 1, name: 'A', price: 100 },
        { id: 2, name: 'B', price: 150 },
        { id: 3, name: 'C', price: 120 },
    ];

    it('有效报价按得分降序排列', () => {
        const config = { mode: 'single' };
        const results = getSortedResults(bids, config);
        expect(results[0].name).toBe('A');
        expect(results[1].name).toBe('C');
        expect(results[2].name).toBe('B');
    });

    it('无效报价排在最后', () => {
        const config = { mode: 'single', maxPrice: 130 };
        const results = getSortedResults(bids, config);
        expect(results[0].isValid).toBe(true);
        expect(results[1].isValid).toBe(true);
        expect(results[2].isValid).toBe(false);
        expect(results[2].name).toBe('B');
        expect(results[2].invalidReason).toBe('超上限');
    });

    it('同分报价按价格升序排列', () => {
        const tieBids = [
            { id: 1, name: 'A', price: 100 },
            { id: 2, name: 'B', price: 100 },
        ];
        const config = { mode: 'single' };
        const results = getSortedResults(tieBids, config);
        expect(results[0].score).toBe(results[1].score);
        expect(results[0].price).toBeLessThanOrEqual(results[1].price);
    });

    it('同分同名次', () => {
        const tieBids = [
            { id: 1, name: 'A', price: 100 },
            { id: 2, name: 'B', price: 100 },
            { id: 3, name: 'C', price: 110 },
        ];
        const config = { mode: 'single' };
        const results = getSortedResults(tieBids, config);
        expect(results[0].rank).toBe(1);
        expect(results[1].rank).toBe(1);
        expect(results[2].rank).toBe(3);
    });

    it('无效报价没有排名', () => {
        const config = { mode: 'single', maxPrice: 120 };
        const results = getSortedResults(bids, config);
        const invalidResult = results.find(r => !r.isValid);
        expect(invalidResult.rank).toBeNull();
    });

    it('返回结果包含所有必要字段', () => {
        const config = { mode: 'single' };
        const results = getSortedResults(bids, config);
        expect(results[0]).toHaveProperty('id');
        expect(results[0]).toHaveProperty('name');
        expect(results[0]).toHaveProperty('price');
        expect(results[0]).toHaveProperty('isValid');
        expect(results[0]).toHaveProperty('invalidReason');
        expect(results[0]).toHaveProperty('deviation');
        expect(results[0]).toHaveProperty('deduction');
        expect(results[0]).toHaveProperty('score');
        expect(results[0]).toHaveProperty('rank');
    });
});

describe('默认配置 (defaultConfig)', () => {
    it('包含所有必要的默认配置项', () => {
        expect(defaultConfig).toHaveProperty('mode', 'single');
        expect(defaultConfig).toHaveProperty('maxPrice', null);
        expect(defaultConfig).toHaveProperty('minPrice', null);
        expect(defaultConfig).toHaveProperty('fullScore', 30);
        expect(defaultConfig).toHaveProperty('deductUp', 1.0);
        expect(defaultConfig).toHaveProperty('deductDown', 0.5);
        expect(defaultConfig).toHaveProperty('minScore', 0);
        expect(defaultConfig).toHaveProperty('lowestWeight', 40);
    });
});

describe('完整链路测试', () => {
    it('单低模式完整计算链路', () => {
        const bids = [
            { id: 1, name: '甲公司', price: 90 },
            { id: 2, name: '乙公司', price: 100 },
            { id: 3, name: '丙公司', price: 110 },
        ];
        const config = {
            mode: 'single',
            maxPrice: 120,
            minPrice: 80,
            fullScore: 30,
            deductUp: 1.0,
            deductDown: 0.5,
            minScore: 0,
        };

        const results = getSortedResults(bids, config);

        expect(results[0].name).toBe('甲公司');
        expect(results[0].score).toBe(30);
        expect(results[0].deviation).toBe(0);

        expect(results[1].name).toBe('乙公司');
        expect(results[1].deviation).toBeCloseTo(11.111);
        expect(results[1].deduction).toBeCloseTo(11.111);
        expect(results[1].score).toBeCloseTo(18.889);

        expect(results[2].name).toBe('丙公司');
        expect(results[2].deviation).toBeCloseTo(22.222);
        expect(results[2].deduction).toBeCloseTo(22.222);
        expect(results[2].score).toBeCloseTo(7.778);
    });

    it('双低模式完整计算链路', () => {
        const bids = [
            { id: 1, name: '甲公司', price: 80 },
            { id: 2, name: '乙公司', price: 100 },
            { id: 3, name: '丙公司', price: 120 },
        ];
        const config = {
            mode: 'double',
            lowestWeight: 40,
            fullScore: 30,
            deductUp: 1.0,
            deductDown: 0.5,
        };

        const baseline = calculateBaselinePrice(bids, config);
        const expectedBaseline = 80 * 0.4 + 100 * 0.6;
        expect(baseline).toBeCloseTo(expectedBaseline);

        const results = getSortedResults(bids, config);
        expect(results[0].isValid).toBe(true);
        expect(results[results.length - 1].isValid).toBe(true);
    });

    it('包含废标的完整计算链路', () => {
        const bids = [
            { id: 1, name: '甲公司', price: 100 },
            { id: 2, name: '乙公司', price: 200 },
            { id: 3, name: '丙公司', price: 50 },
        ];
        const config = {
            mode: 'single',
            maxPrice: 150,
            minPrice: 80,
            fullScore: 30,
            deductUp: 1,
        };

        const results = getSortedResults(bids, config);
        const validResults = results.filter(r => r.isValid);
        const invalidResults = results.filter(r => !r.isValid);

        expect(validResults.length).toBe(1);
        expect(validResults[0].name).toBe('甲公司');
        expect(validResults[0].score).toBe(30);

        expect(invalidResults.length).toBe(2);
        expect(invalidResults.find(r => r.name === '乙公司').invalidReason).toBe('超上限');
        expect(invalidResults.find(r => r.name === '丙公司').invalidReason).toBe('低下限');
    });
});
