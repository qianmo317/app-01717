/**
 * 价格分计算（calculateScore / calculateDeviation / calculateDeduction）测试
 * 覆盖：等于基准价、上浮扣分、下浮扣分、最低/最高得分钳制、空数据
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { bidCalculator } from './_helpers/loadCalculator.js';

const setBids = (calc, prices) => {
    calc.bids = prices.map((p, i) => ({ id: i + 1, name: `B${i + 1}`, price: p }));
};

describe('价格分计算 - calculateScore', () => {
    let calc;

    beforeEach(() => {
        calc = bidCalculator();
        // 默认：单低、满分30、上浮扣分1.0、下浮扣分0.5、最低0
    });

    describe('异常情况：无基准价', () => {
        it('无报价时，所有计算返回 0', () => {
            expect(calc.calculateDeviation(1000)).toBe(0);
            expect(calc.calculateDeduction(1000)).toBe(0);
            expect(calc.calculateScore(1000)).toBe(0);
        });

        it('全部废标时，所有计算返回 0', () => {
            calc.config.maxPrice = 100;
            setBids(calc, [500, 800]);
            expect(calc.calculateDeviation(500)).toBe(0);
            expect(calc.calculateDeduction(500)).toBe(0);
            expect(calc.calculateScore(500)).toBe(0);
        });
    });

    describe('正常情况：偏离率', () => {
        it('报价 = 基准价时偏离率为 0', () => {
            setBids(calc, [1000, 1200]);
            // baseline=1000
            expect(calc.calculateDeviation(1000)).toBe(0);
        });

        it('高于基准价时偏离率为正', () => {
            setBids(calc, [1000, 1500]);
            // baseline=1000，1100相对偏离 +10%
            expect(calc.calculateDeviation(1100)).toBeCloseTo(10, 6);
        });

        it('低于基准价时偏离率为负', () => {
            setBids(calc, [1000, 1500]);
            // baseline=1000，900相对偏离 -10%
            expect(calc.calculateDeviation(900)).toBeCloseTo(-10, 6);
        });
    });

    describe('正常情况：扣分（calculateDeduction）', () => {
        it('报价 = 基准价 → 扣分为 0', () => {
            setBids(calc, [1000, 1500]);
            expect(calc.calculateDeduction(1000)).toBe(0);
        });

        it('上浮：扣分 = 偏离率 × 上浮系数', () => {
            calc.config.deductUp = 1.0;
            setBids(calc, [1000, 1500]);
            // 1100 偏离+10% → 扣 10*1.0 = 10
            expect(calc.calculateDeduction(1100)).toBeCloseTo(10, 6);
        });

        it('下浮：扣分 = |偏离率| × 下浮系数', () => {
            calc.config.deductDown = 0.5;
            setBids(calc, [1000, 1500]);
            // 注意 baseline 取 min=1000；想测下浮需有更低报价
            setBids(calc, [800, 1500]);
            // baseline=800；用 720 → -10% → 扣 10*0.5 = 5
            expect(calc.calculateDeduction(720)).toBeCloseTo(5, 6);
        });

        it('下浮系数为 0 时，低于基准价不扣分', () => {
            calc.config.deductDown = 0;
            setBids(calc, [800, 1500]);
            expect(calc.calculateDeduction(720)).toBe(0);
        });
    });

    describe('正常情况：得分（calculateScore）', () => {
        it('报价等于基准价 → 满分', () => {
            calc.config.fullScore = 30;
            setBids(calc, [1000, 1500]);
            expect(calc.calculateScore(1000)).toBe(30);
        });

        it('得分 = 满分 - 扣分（上浮）', () => {
            calc.config.fullScore = 30;
            calc.config.deductUp = 1.0;
            setBids(calc, [1000, 1500]);
            // 1100 → 扣10 → 得20
            expect(calc.calculateScore(1100)).toBeCloseTo(20, 6);
        });

        it('得分 = 满分 - 扣分（下浮）', () => {
            calc.config.fullScore = 30;
            calc.config.deductDown = 0.5;
            setBids(calc, [800, 1500]);
            // 720 → 扣5 → 得25
            expect(calc.calculateScore(720)).toBeCloseTo(25, 6);
        });

        it('双低模式下基于复合基准价计算得分', () => {
            calc.config.mode = 'double';
            calc.config.lowestWeight = 40;
            calc.config.fullScore = 100;
            calc.config.deductUp = 1.0;
            calc.config.deductDown = 0.5;
            setBids(calc, [800, 1000, 1200]);
            // baseline = 800*0.4 + 1000*0.6 = 920
            // 报价 920 → 满分
            expect(calc.calculateScore(920)).toBeCloseTo(100, 6);
            // 报价 1012 → 偏离 +10% → 扣10 → 90
            expect(calc.calculateScore(1012)).toBeCloseTo(90, 6);
            // 报价 828 → 偏离 -10% → 扣5 → 95
            expect(calc.calculateScore(828)).toBeCloseTo(95, 6);
        });
    });

    describe('边界情况：得分钳制', () => {
        it('扣分超过满分 → 钳到 minScore', () => {
            calc.config.fullScore = 30;
            calc.config.minScore = 0;
            calc.config.deductUp = 10; // 极端系数
            setBids(calc, [1000, 5000]);
            // 报价 2000 → 偏离 +100% → 扣 1000 → 钳到 0
            expect(calc.calculateScore(2000)).toBe(0);
        });

        it('自定义 minScore 时，最低不低于该值', () => {
            calc.config.fullScore = 30;
            calc.config.minScore = 10;
            calc.config.deductUp = 10;
            setBids(calc, [1000, 5000]);
            expect(calc.calculateScore(2000)).toBe(10);
        });

        it('得分不会高于满分（理论防御）', () => {
            calc.config.fullScore = 30;
            // 通过把下浮扣分改为负值，模拟"加分"，验证仍不超过满分
            calc.config.deductDown = -1; // 低于基准反而"加分" → 应被钳到满分
            setBids(calc, [800, 1500]);
            // 720 偏离 -10% → 扣 -5（即加5）→ 35 → 钳到 30
            expect(calc.calculateScore(720)).toBe(30);
        });

        it('恰好等于 minScore 边界时返回 minScore', () => {
            calc.config.fullScore = 30;
            calc.config.minScore = 5;
            calc.config.deductUp = 1.0;
            setBids(calc, [1000, 2000]);
            // 偏离 +25% → 扣25 → 5 → 等于 minScore
            expect(calc.calculateScore(1250)).toBeCloseTo(5, 6);
        });
    });

    describe('集成：sortedResults 包含废标与得分排序', () => {
        it('有效报价按得分降序，废标排在最后且得分为 0', () => {
            calc.config.mode = 'single';
            calc.config.maxPrice = 2000;
            calc.config.fullScore = 30;
            calc.config.deductUp = 1.0;
            calc.config.deductDown = 0.5;
            setBids(calc, [1000, 1100, 2500, 1200]); // 2500 废标
            const results = calc.sortedResults;

            expect(results).toHaveLength(4);
            // 最低有效价 1000 → 满分
            const top = results[0];
            expect(top.price).toBe(1000);
            expect(top.score).toBeCloseTo(30, 6);
            expect(top.rank).toBe(1);
            // 废标项排末尾
            const last = results[results.length - 1];
            expect(last.isValid).toBe(false);
            expect(last.invalidReason).toBe('超上限');
            expect(last.score).toBe(0);
            expect(last.rank).toBeNull();
        });

        it('同分时同名次（rank 相等），后续名次跳号', () => {
            calc.config.mode = 'single';
            calc.config.fullScore = 30;
            calc.config.deductUp = 1.0;
            calc.config.deductDown = 0.5;
            // baseline=1000；1100 与 900 得分相同
            // 1100 偏离+10% 扣10 → 20
            // 900  偏离-10% 扣5  → 25
            // 让两个得分相同：
            setBids(calc, [1000, 1100, 1100, 1300]);
            // 1000→30, 1100→20, 1100→20, 1300→0(扣30→0)
            const results = calc.sortedResults.filter(r => r.isValid);
            expect(results[0].rank).toBe(1); // 1000
            expect(results[1].rank).toBe(2); // 1100
            expect(results[2].rank).toBe(2); // 1100 同分同名次
            expect(results[3].rank).toBe(4); // 跳到 4
        });
    });
});
