import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
    path.resolve(__dirname, '../frontend-user/js/app.js'),
    'utf8'
);
const createCalculator = new Function(source + '; return bidCalculator;')();

function createInstance(overrides = {}) {
    const instance = createCalculator();
    if (overrides.config) {
        Object.assign(instance.config, overrides.config);
    }
    if (overrides.bids) {
        instance.bids = overrides.bids.map((b, i) => ({
            id: i + 1,
            name: b.name,
            price: b.price
        }));
    }
    return instance;
}

describe('checkValidity - 报价有效性判断', () => {
    let calc;

    beforeEach(() => {
        calc = createInstance();
    });

    describe('正常情况', () => {
        it('无限价设置时，所有正数报价均有效', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = null;

            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(0.01)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(999999)).toEqual({ valid: true, reason: '' });
        });

        it('报价在上下限之间时有效', () => {
            calc.config.maxPrice = 200;
            calc.config.minPrice = 50;

            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(150)).toEqual({ valid: true, reason: '' });
        });

        it('仅设置上限价时，低于上限的报价有效', () => {
            calc.config.maxPrice = 200;
            calc.config.minPrice = null;

            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(199.99)).toEqual({ valid: true, reason: '' });
        });

        it('仅设置下限价时，高于下限的报价有效', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = 50;

            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(50.01)).toEqual({ valid: true, reason: '' });
        });
    });

    describe('边界情况', () => {
        it('报价恰好等于上限价时有效（不触发超上限）', () => {
            calc.config.maxPrice = 200;
            calc.config.minPrice = null;

            expect(calc.checkValidity(200)).toEqual({ valid: true, reason: '' });
        });

        it('报价恰好等于下限价时有效（不触发低下限）', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = 50;

            expect(calc.checkValidity(50)).toEqual({ valid: true, reason: '' });
        });

        it('报价恰好等于上下限价时有效', () => {
            calc.config.maxPrice = 100;
            calc.config.minPrice = 100;

            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
        });

        it('报价刚超过上限价时无效', () => {
            calc.config.maxPrice = 200;
            calc.config.minPrice = null;

            expect(calc.checkValidity(200.01)).toEqual({ valid: false, reason: '超上限' });
        });

        it('报价刚低于下限价时无效', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = 50;

            expect(calc.checkValidity(49.99)).toEqual({ valid: false, reason: '低下限' });
        });

        it('上限价为0时，正数报价均超上限', () => {
            calc.config.maxPrice = 0;
            calc.config.minPrice = null;

            expect(calc.checkValidity(0.01)).toEqual({ valid: false, reason: '超上限' });
            expect(calc.checkValidity(0)).toEqual({ valid: true, reason: '' });
        });

        it('下限价为0时，负数报价低下限', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = 0;

            expect(calc.checkValidity(-0.01)).toEqual({ valid: false, reason: '低下限' });
            expect(calc.checkValidity(0)).toEqual({ valid: true, reason: '' });
        });
    });

    describe('异常情况', () => {
        it('maxPrice 为空字符串时视为未设置', () => {
            calc.config.maxPrice = '';
            calc.config.minPrice = null;

            expect(calc.checkValidity(999999)).toEqual({ valid: true, reason: '' });
        });

        it('minPrice 为空字符串时视为未设置', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = '';

            expect(calc.checkValidity(0.01)).toEqual({ valid: true, reason: '' });
        });

        it('maxPrice 和 minPrice 均为空字符串时视为无限制', () => {
            calc.config.maxPrice = '';
            calc.config.minPrice = '';

            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
        });

        it('超上限优先于低下限判断', () => {
            calc.config.maxPrice = 50;
            calc.config.minPrice = 100;

            expect(calc.checkValidity(200)).toEqual({ valid: false, reason: '超上限' });
            expect(calc.checkValidity(30)).toEqual({ valid: false, reason: '低下限' });
        });

        it('负数报价在无下限限制时有效', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = null;

            expect(calc.checkValidity(-100)).toEqual({ valid: true, reason: '' });
        });

        it('零报价在无下限限制时有效', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = null;

            expect(calc.checkValidity(0)).toEqual({ valid: true, reason: '' });
        });
    });
});

describe('baselinePrice - 基准价计算', () => {
    describe('单低模式', () => {
        it('基准价等于最低有效报价', () => {
            const calc = createInstance({
                config: { mode: 'single' },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 90 },
                    { name: 'C', price: 80 }
                ]
            });

            expect(calc.baselinePrice).toBe(80);
        });

        it('所有报价相同时基准价等于该值', () => {
            const calc = createInstance({
                config: { mode: 'single' },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 100 },
                    { name: 'C', price: 100 }
                ]
            });

            expect(calc.baselinePrice).toBe(100);
        });

        it('只有一家报价时基准价等于该报价', () => {
            const calc = createInstance({
                config: { mode: 'single' },
                bids: [
                    { name: 'A', price: 100 }
                ]
            });

            expect(calc.baselinePrice).toBe(100);
        });

        it('排除无效报价后取最低有效报价', () => {
            const calc = createInstance({
                config: { mode: 'single', maxPrice: 95, minPrice: null },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 90 },
                    { name: 'C', price: 80 }
                ]
            });

            expect(calc.baselinePrice).toBe(80);
        });
    });

    describe('双低模式', () => {
        it('基准价 = 最低价×权重 + 平均价×(1-权重)', () => {
            const calc = createInstance({
                config: { mode: 'double', lowestWeight: 40 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 },
                    { name: 'C', price: 60 }
                ]
            });

            const lowest = 60;
            const avg = (100 + 80 + 60) / 3;
            const expected = lowest * 0.4 + avg * 0.6;

            expect(calc.baselinePrice).toBeCloseTo(expected, 10);
        });

        it('权重为0时基准价等于平均价', () => {
            const calc = createInstance({
                config: { mode: 'double', lowestWeight: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 },
                    { name: 'C', price: 60 }
                ]
            });

            const avg = (100 + 80 + 60) / 3;
            expect(calc.baselinePrice).toBeCloseTo(avg, 10);
        });

        it('权重为100时基准价等于最低价（退化为单低模式）', () => {
            const calc = createInstance({
                config: { mode: 'double', lowestWeight: 100 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 },
                    { name: 'C', price: 60 }
                ]
            });

            expect(calc.baselinePrice).toBe(60);
        });

        it('权重为50时基准价等于最低价和平均价的均值', () => {
            const calc = createInstance({
                config: { mode: 'double', lowestWeight: 50 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 },
                    { name: 'C', price: 60 }
                ]
            });

            const lowest = 60;
            const avg = (100 + 80 + 60) / 3;
            const expected = (lowest + avg) / 2;

            expect(calc.baselinePrice).toBeCloseTo(expected, 10);
        });

        it('只有一家报价时最低价和平均价相同', () => {
            const calc = createInstance({
                config: { mode: 'double', lowestWeight: 40 },
                bids: [
                    { name: 'A', price: 100 }
                ]
            });

            expect(calc.baselinePrice).toBe(100);
        });
    });

    describe('无有效报价', () => {
        it('报价列表为空时基准价为 null', () => {
            const calc = createInstance({
                config: { mode: 'single' },
                bids: []
            });

            expect(calc.baselinePrice).toBeNull();
        });

        it('所有报价均无效时基准价为 null', () => {
            const calc = createInstance({
                config: { mode: 'single', maxPrice: 50, minPrice: null },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 90 },
                    { name: 'C', price: 80 }
                ]
            });

            expect(calc.baselinePrice).toBeNull();
        });

        it('双低模式下无有效报价时基准价为 null', () => {
            const calc = createInstance({
                config: { mode: 'double', lowestWeight: 40, maxPrice: 50, minPrice: null },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 90 }
                ]
            });

            expect(calc.baselinePrice).toBeNull();
        });
    });
});

describe('calculateDeviation - 偏离率计算', () => {
    it('报价等于基准价时偏离率为0', () => {
        const calc = createInstance({
            config: { mode: 'single' },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeviation(80)).toBe(0);
    });

    it('报价高于基准价时偏离率为正', () => {
        const calc = createInstance({
            config: { mode: 'single' },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeviation(100)).toBeCloseTo(25, 10);
    });

    it('报价低于基准价时偏离率为负', () => {
        const calc = createInstance({
            config: { mode: 'single' },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeviation(60)).toBeCloseTo(-25, 10);
    });

    it('偏离率 = (报价 - 基准价) / 基准价 × 100', () => {
        const calc = createInstance({
            config: { mode: 'single' },
            bids: [
                { name: 'A', price: 90 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeviation(90)).toBeCloseTo(12.5, 10);
    });

    it('无基准价时偏离率为0', () => {
        const calc = createInstance({
            config: { mode: 'single' },
            bids: []
        });

        expect(calc.calculateDeviation(100)).toBe(0);
    });
});

describe('calculateDeduction - 扣分计算', () => {
    it('报价等于基准价时扣分为0', () => {
        const calc = createInstance({
            config: { mode: 'single', deductUp: 1.0, deductDown: 0.5 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeduction(80)).toBe(0);
    });

    it('报价高于基准价时扣分 = 偏离率 × 上浮系数', () => {
        const calc = createInstance({
            config: { mode: 'single', deductUp: 1.0, deductDown: 0.5 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeduction(100)).toBeCloseTo(25, 10);
    });

    it('报价低于基准价时扣分 = |偏离率| × 下浮系数', () => {
        const calc = createInstance({
            config: { mode: 'single', deductUp: 1.0, deductDown: 0.5 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeduction(60)).toBeCloseTo(12.5, 10);
    });

    it('下浮系数为0时低于基准价不扣分', () => {
        const calc = createInstance({
            config: { mode: 'single', deductUp: 1.0, deductDown: 0 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        expect(calc.calculateDeduction(60)).toBe(0);
    });

    it('无基准价时扣分为0', () => {
        const calc = createInstance({
            config: { mode: 'single', deductUp: 1.0, deductDown: 0.5 },
            bids: []
        });

        expect(calc.calculateDeduction(100)).toBe(0);
    });

    it('上浮系数和下浮系数不同时扣分不对称', () => {
        const calc = createInstance({
            config: { mode: 'single', deductUp: 2.0, deductDown: 1.0 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        const upDeduction = calc.calculateDeduction(100);
        const downDeduction = calc.calculateDeduction(60);

        expect(upDeduction).toBeCloseTo(50, 10);
        expect(downDeduction).toBeCloseTo(25, 10);
    });
});

describe('calculateScore - 价格分计算', () => {
    describe('正常情况', () => {
        it('报价等于基准价时得满分', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(80)).toBe(30);
        });

        it('报价高于基准价时得分 = 满分 - 扣分', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(100)).toBeCloseTo(5, 10);
        });

        it('报价低于基准价时得分 = 满分 - 扣分', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(60)).toBeCloseTo(17.5, 10);
        });

        it('下浮系数为0时低于基准价仍得满分', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0, minScore: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(60)).toBe(30);
        });
    });

    describe('边界情况', () => {
        it('得分不低于最低分限制', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 5 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(10000)).toBe(5);
        });

        it('得分不超过满分', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(80)).toBeLessThanOrEqual(30);
        });

        it('最低分为0时扣分可以使得分为0', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(10000)).toBe(0);
        });

        it('偏离率很小时得分接近满分', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(80.8)).toBeCloseTo(29, 1);
        });
    });

    describe('异常情况', () => {
        it('无基准价时得分为0', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
                bids: []
            });

            expect(calc.calculateScore(100)).toBe(0);
        });

        it('minScore 大于 fullScore 时得分被钳制', () => {
            const calc = createInstance({
                config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 50 },
                bids: [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 }
                ]
            });

            expect(calc.calculateScore(10000)).toBe(30);
        });
    });
});

describe('validBids - 有效报价过滤', () => {
    it('只返回有效报价', () => {
        const calc = createInstance({
            config: { mode: 'single', maxPrice: 95, minPrice: null },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 90 },
                { name: 'C', price: 80 }
            ]
        });

        expect(calc.validBids.length).toBe(2);
        expect(calc.validBids.map(b => b.price)).toEqual([90, 80]);
    });

    it('无限价时所有报价均有效', () => {
        const calc = createInstance({
            config: { mode: 'single', maxPrice: null, minPrice: null },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 90 },
                { name: 'C', price: 80 }
            ]
        });

        expect(calc.validBids.length).toBe(3);
    });

    it('所有报价均无效时返回空数组', () => {
        const calc = createInstance({
            config: { mode: 'single', maxPrice: 50, minPrice: null },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 90 }
            ]
        });

        expect(calc.validBids).toEqual([]);
    });
});

describe('sortedResults - 排序与排名', () => {
    it('有效报价按得分降序排列', () => {
        const calc = createInstance({
            config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 },
                { name: 'C', price: 90 }
            ]
        });

        const results = calc.sortedResults;
        const validResults = results.filter(r => r.isValid);
        const scores = validResults.map(r => r.score);

        for (let i = 1; i < scores.length; i++) {
            expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
        }
    });

    it('无效报价排在有效报价之后', () => {
        const calc = createInstance({
            config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0, maxPrice: 95 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 90 },
                { name: 'C', price: 80 }
            ]
        });

        const results = calc.sortedResults;
        const firstInvalidIndex = results.findIndex(r => !r.isValid);
        const lastValidIndex = results.length - 1 - [...results].reverse().findIndex(r => r.isValid);

        if (firstInvalidIndex !== -1 && lastValidIndex !== -1) {
            expect(firstInvalidIndex).toBeGreaterThan(lastValidIndex);
        }
    });

    it('同分报价同名次', () => {
        const calc = createInstance({
            config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            bids: [
                { name: 'A', price: 80 },
                { name: 'B', price: 80 },
                { name: 'C', price: 90 }
            ]
        });

        const results = calc.sortedResults.filter(r => r.isValid);
        const samePriceResults = results.filter(r => r.price === 80);

        if (samePriceResults.length >= 2) {
            expect(samePriceResults[0].rank).toBe(samePriceResults[1].rank);
        }
    });

    it('无效报价排名为 null', () => {
        const calc = createInstance({
            config: { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0, maxPrice: 85 },
            bids: [
                { name: 'A', price: 100 },
                { name: 'B', price: 80 }
            ]
        });

        const invalidResults = calc.sortedResults.filter(r => !r.isValid);
        invalidResults.forEach(r => {
            expect(r.rank).toBeNull();
            expect(r.score).toBe(0);
        });
    });
});

describe('完整计算链路集成测试', () => {
    it('单低模式完整流程：添加报价 → 有效性判断 → 基准价 → 得分', () => {
        const calc = createInstance({
            config: {
                mode: 'single',
                maxPrice: 110,
                minPrice: 70,
                fullScore: 30,
                deductUp: 1.0,
                deductDown: 0.5,
                minScore: 0
            },
            bids: [
                { name: '超上限', price: 120 },
                { name: 'A公司', price: 100 },
                { name: 'B公司', price: 90 },
                { name: 'C公司', price: 80 },
                { name: '低下限', price: 60 }
            ]
        });

        expect(calc.checkValidity(120)).toEqual({ valid: false, reason: '超上限' });
        expect(calc.checkValidity(60)).toEqual({ valid: false, reason: '低下限' });
        expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });

        expect(calc.validBidsCount).toBe(3);
        expect(calc.lowestValidPrice).toBe(80);
        expect(calc.baselinePrice).toBe(80);

        expect(calc.calculateScore(80)).toBe(30);
        expect(calc.calculateScore(90)).toBeCloseTo(17.5, 10);
        expect(calc.calculateScore(100)).toBeCloseTo(5, 10);
    });

    it('双低模式完整流程', () => {
        const calc = createInstance({
            config: {
                mode: 'double',
                maxPrice: null,
                minPrice: null,
                fullScore: 30,
                deductUp: 1.0,
                deductDown: 0.5,
                minScore: 0,
                lowestWeight: 40
            },
            bids: [
                { name: 'A公司', price: 100 },
                { name: 'B公司', price: 80 },
                { name: 'C公司', price: 60 }
            ]
        });

        const lowest = 60;
        const avg = (100 + 80 + 60) / 3;
        const expectedBaseline = lowest * 0.4 + avg * 0.6;

        expect(calc.baselinePrice).toBeCloseTo(expectedBaseline, 10);

        const baseline = calc.baselinePrice;
        const deviationA = ((100 - baseline) / baseline) * 100;
        const deductionA = deviationA * 1.0;
        const scoreA = Math.max(30 - deductionA, 0);

        expect(calc.calculateScore(100)).toBeCloseTo(scoreA, 5);
    });
});
