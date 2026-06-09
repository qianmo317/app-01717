/**
 * 评标基准价（baselinePrice）测试
 * 覆盖：单低模式、双低模式、不同权重、空集、边界
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { bidCalculator } from './_helpers/loadCalculator.js';

const setBids = (calc, prices) => {
    calc.bids = prices.map((p, i) => ({ id: i + 1, name: `B${i + 1}`, price: p }));
};

describe('baselinePrice - 评标基准价', () => {
    let calc;

    beforeEach(() => {
        calc = bidCalculator();
    });

    describe('空集 / 异常情况', () => {
        it('没有任何报价时，基准价为 null', () => {
            expect(calc.baselinePrice).toBeNull();
            expect(calc.lowestValidPrice).toBeNull();
            expect(calc.averageValidPrice).toBeNull();
        });

        it('全部报价废标时，基准价为 null', () => {
            calc.config.maxPrice = 100;
            setBids(calc, [200, 300]);
            expect(calc.validBidsCount).toBe(0);
            expect(calc.baselinePrice).toBeNull();
        });
    });

    describe('单低模式（mode=single）', () => {
        beforeEach(() => {
            calc.config.mode = 'single';
        });

        it('基准价 = 最低有效报价', () => {
            setBids(calc, [1000, 800, 1200, 950]);
            expect(calc.baselinePrice).toBe(800);
        });

        it('仅一个有效报价时，基准价等于该报价', () => {
            setBids(calc, [1000]);
            expect(calc.baselinePrice).toBe(1000);
        });

        it('应排除废标报价后再取最低', () => {
            calc.config.minPrice = 500;
            setBids(calc, [400, 600, 700, 300]); // 400/300 废标
            expect(calc.baselinePrice).toBe(600);
        });

        it('多个相同最低价时，基准价仍为该最低值', () => {
            setBids(calc, [800, 800, 1000]);
            expect(calc.baselinePrice).toBe(800);
        });
    });

    describe('双低模式（mode=double）', () => {
        beforeEach(() => {
            calc.config.mode = 'double';
        });

        it('权重 40/60 时，基准价 = 最低×0.4 + 平均×0.6', () => {
            calc.config.lowestWeight = 40;
            setBids(calc, [800, 1000, 1200]);
            // lowest=800, avg=1000
            // baseline = 800*0.4 + 1000*0.6 = 320 + 600 = 920
            expect(calc.baselinePrice).toBeCloseTo(920, 6);
        });

        it('权重 100% 时退化为单低（仅最低价）', () => {
            calc.config.lowestWeight = 100;
            setBids(calc, [800, 1000, 1200]);
            // baseline = 800*1 + avg*0 = 800
            expect(calc.baselinePrice).toBeCloseTo(800, 6);
        });

        it('权重 0% 时基准价等于平均值', () => {
            calc.config.lowestWeight = 0;
            setBids(calc, [800, 1000, 1200]);
            // baseline = 0 + 1000*1 = 1000
            expect(calc.baselinePrice).toBeCloseTo(1000, 6);
        });

        it('仅一个有效报价时，最低价==平均价，基准价等于该报价', () => {
            calc.config.lowestWeight = 40;
            setBids(calc, [1000]);
            expect(calc.baselinePrice).toBeCloseTo(1000, 6);
        });

        it('应基于"有效报价"集合计算（剔除废标后）', () => {
            calc.config.lowestWeight = 50;
            calc.config.maxPrice = 1500;
            setBids(calc, [800, 1000, 1200, 2000]); // 2000 废标
            // valid: [800, 1000, 1200], lowest=800, avg=1000
            // baseline = 800*0.5 + 1000*0.5 = 900
            expect(calc.baselinePrice).toBeCloseTo(900, 6);
        });

        it('小数权重运算精度（30%/70%）', () => {
            calc.config.lowestWeight = 30;
            setBids(calc, [100, 200, 300]);
            // lowest=100, avg=200
            // baseline = 100*0.3 + 200*0.7 = 30 + 140 = 170
            expect(calc.baselinePrice).toBeCloseTo(170, 6);
        });
    });
});
