const { createCalc } = require('./helpers.js');

describe('calculateDeviation - 偏离率计算', () => {
    it('报价等于基准价时偏离率为 0', () => {
        const calc = createCalc(
            { mode: 'single' },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeviation(100)).toBe(0);
    });

    it('报价高于基准价时偏离率为正值', () => {
        const calc = createCalc(
            { mode: 'single' },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeviation(110)).toBe(10);
    });

    it('报价低于基准价时偏离率为负值', () => {
        const calc = createCalc(
            { mode: 'single' },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeviation(90)).toBe(-10);
    });

    it('偏离率公式: (报价-基准价)/基准价×100', () => {
        const calc = createCalc(
            { mode: 'single' },
            [{ name: 'A', price: 200 }]
        );
        expect(calc.calculateDeviation(250)).toBe(25);
        expect(calc.calculateDeviation(150)).toBe(-25);
    });

    it('无基准价（无有效报价）时偏离率返回 0', () => {
        const calc = createCalc();
        expect(calc.calculateDeviation(100)).toBe(0);
    });

    it('小数偏离率计算正确', () => {
        const calc = createCalc(
            { mode: 'single' },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeviation(100.5)).toBeCloseTo(0.5, 10);
        expect(calc.calculateDeviation(99.5)).toBeCloseTo(-0.5, 10);
    });
});

describe('calculateDeduction - 扣分计算', () => {
    it('报价等于基准价时扣分为 0', () => {
        const calc = createCalc(
            { mode: 'single', deductUp: 1.0, deductDown: 0.5 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeduction(100)).toBe(0);
    });

    it('报价高于基准价时扣分 = 偏离率 × 上浮扣分系数', () => {
        const calc = createCalc(
            { mode: 'single', deductUp: 1.0, deductDown: 0.5 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeduction(110)).toBe(10);
        expect(calc.calculateDeduction(105)).toBe(5);
    });

    it('上浮扣分系数为 2 时高报扣分加倍', () => {
        const calc = createCalc(
            { mode: 'single', deductUp: 2.0, deductDown: 0.5 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeduction(110)).toBe(20);
    });

    it('报价低于基准价时扣分 = |偏离率| × 下浮扣分系数', () => {
        const calc = createCalc(
            { mode: 'single', deductUp: 1.0, deductDown: 0.5 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeduction(90)).toBe(5);
        expect(calc.calculateDeduction(95)).toBe(2.5);
    });

    it('下浮扣分系数为 0 时低于基准价不扣分', () => {
        const calc = createCalc(
            { mode: 'single', deductUp: 1.0, deductDown: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeduction(50)).toBe(0);
        expect(calc.calculateDeduction(90)).toBe(0);
    });

    it('无基准价时扣分返回 0', () => {
        const calc = createCalc({ deductUp: 1.0, deductDown: 0.5 });
        expect(calc.calculateDeduction(100)).toBe(0);
    });

    it('高报和低报同时验证不对称扣分', () => {
        const calc = createCalc(
            { mode: 'single', deductUp: 1.5, deductDown: 0.8 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateDeduction(110)).toBe(15);
        expect(calc.calculateDeduction(90)).toBe(8);
    });
});

describe('calculateScore - 价格分计算', () => {
    it('基准价报价得满分', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(100)).toBe(30);
    });

    it('高于基准价按上浮系数扣分', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(110)).toBe(20);
        expect(calc.calculateScore(105)).toBe(25);
    });

    it('低于基准价按下浮系数扣分', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(90)).toBe(25);
        expect(calc.calculateScore(95)).toBe(27.5);
    });

    it('得分不低于最低得分限制 minScore', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 5 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(200)).toBe(5);
    });

    it('扣分不超过满分（不超过 fullScore，不出现负分）', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(100)).toBe(30);
        expect(calc.calculateScore(50)).toBe(5);
    });

    it('得分不会超过满分（即使计算出 > fullScore 的值）', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(100)).toBe(30);
    });

    it('无基准价时得分返回 0', () => {
        const calc = createCalc({ fullScore: 30 });
        expect(calc.calculateScore(100)).toBe(0);
    });

    it('下浮扣分系数为 0 时低价不扣分（得满分）', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0, minScore: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(10)).toBe(30);
        expect(calc.calculateScore(90)).toBe(30);
    });

    it('双低模式下完整链路计算分数正确', () => {
        const calc = createCalc(
            { mode: 'double', lowestWeight: 40, fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            [
                { name: 'A', price: 80 },
                { name: 'B', price: 100 },
                { name: 'C', price: 120 },
            ]
        );
        const baseline = 80 * 0.4 + 100 * 0.6;
        const devA = ((80 - baseline) / baseline) * 100;
        const expectedA = Math.max(30 - Math.abs(devA) * 0.5, 0);
        expect(calc.calculateScore(80)).toBeCloseTo(expectedA, 10);

        const devB = ((100 - baseline) / baseline) * 100;
        const expectedB = Math.max(30 - Math.abs(devB) * 1.0, 0);
        expect(calc.calculateScore(100)).toBeCloseTo(expectedB, 10);
    });

    it('满分设为 100 分制时计算正确', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 100, deductUp: 2.0, deductDown: 1.0, minScore: 0 },
            [{ name: 'A', price: 100 }]
        );
        expect(calc.calculateScore(100)).toBe(100);
        expect(calc.calculateScore(105)).toBe(90);
        expect(calc.calculateScore(95)).toBe(95);
    });
});

describe('sortedResults - 排名与排序', () => {
    it('废标报价 isValid 为 false 且 score/deviation/deduction 为 0', () => {
        const calc = createCalc(
            { maxPrice: 100, minPrice: 50 },
            [
                { name: '废标A', price: 120 },
                { name: '有效', price: 80 },
            ]
        );
        const results = calc.sortedResults;
        const invalid = results.find(function(r) { return r.name === '废标A'; });
        expect(invalid.isValid).toBe(false);
        expect(invalid.invalidReason).toBe('超上限');
        expect(invalid.score).toBe(0);
        expect(invalid.deviation).toBe(0);
        expect(invalid.deduction).toBe(0);
        expect(invalid.rank).toBeNull();
    });

    it('有效报价按得分降序排列，无效报价排在后面', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0, maxPrice: 120 },
            [
                { name: '高分', price: 80 },
                { name: '废标', price: 130 },
                { name: '中分', price: 90 },
            ]
        );
        const results = calc.sortedResults;
        expect(results[0].name).toBe('高分');
        expect(results[1].name).toBe('中分');
        expect(results[2].name).toBe('废标');
    });

    it('同分同名次（rank 相同）', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0.5, minScore: 0 },
            [
                { name: 'A', price: 100 },
                { name: 'B', price: 100 },
                { name: 'C', price: 110 },
            ]
        );
        const results = calc.sortedResults;
        expect(results[0].rank).toBe(1);
        expect(results[1].rank).toBe(1);
        expect(results[2].rank).toBe(3);
    });

    it('得分不同时排名连续递增', () => {
        const calc = createCalc(
            { mode: 'single', fullScore: 30, deductUp: 1.0, deductDown: 0, minScore: 0 },
            [
                { name: '最低', price: 80 },
                { name: '中间', price: 90 },
                { name: '最高', price: 100 },
            ]
        );
        const results = calc.sortedResults;
        expect(results.find(function(r) { return r.name === '最低'; }).rank).toBe(1);
        expect(results.find(function(r) { return r.name === '中间'; }).rank).toBe(2);
        expect(results.find(function(r) { return r.name === '最高'; }).rank).toBe(3);
    });

    it('得分相同但价格不同时，按价格升序排列（同分低价在前）', () => {
        const calc = createCalc(
            { mode: 'double', lowestWeight: 50, fullScore: 30, deductUp: 1.0, deductDown: 1.0, minScore: 0 },
            [
                { name: '高价', price: 120 },
                { name: '低价同分', price: 80 },
                { name: '高价同分', price: 100 },
            ]
        );
        const results = calc.sortedResults;
        expect(results[0].score).toBeCloseTo(results[1].score, 10);
        expect(results[0].price).toBeLessThan(results[1].price);
    });

    it('无报价时 sortedResults 返回空数组', () => {
        const calc = createCalc();
        expect(calc.sortedResults).toEqual([]);
    });

    it('所有报价均废标时全部 isValid=false 且 rank=null', () => {
        const calc = createCalc(
            { maxPrice: 100 },
            [
                { name: 'A', price: 110 },
                { name: 'B', price: 200 },
            ]
        );
        const results = calc.sortedResults;
        expect(results).toHaveLength(2);
        results.forEach(function(r) {
            expect(r.isValid).toBe(false);
            expect(r.rank).toBeNull();
        });
    });
});
