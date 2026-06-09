const { createCalc } = require('./helpers.js');

describe('baselinePrice - 基准价计算', () => {

    describe('异常情况：无有效报价', () => {
        it('无报价时基准价为 null', () => {
            const calc = createCalc();
            expect(calc.baselinePrice).toBeNull();
        });

        it('所有报价均废标时基准价为 null', () => {
            const calc = createCalc(
                { maxPrice: 100, minPrice: 80 },
                [
                    { name: 'A', price: 101 },
                    { name: 'B', price: 79 },
                ]
            );
            expect(calc.baselinePrice).toBeNull();
        });

        it('无有效报价时 lowestValidPrice 和 averageValidPrice 也为 null', () => {
            const calc = createCalc(
                { maxPrice: 100 },
                [{ name: 'A', price: 200 }]
            );
            expect(calc.lowestValidPrice).toBeNull();
            expect(calc.averageValidPrice).toBeNull();
        });
    });

    describe('单低模式 (mode=single)', () => {
        it('单低模式基准价 = 最低有效报价', () => {
            const calc = createCalc(
                { mode: 'single' },
                [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 80 },
                    { name: 'C', price: 90 },
                ]
            );
            expect(calc.baselinePrice).toBe(80);
        });

        it('只有一个有效报价时，基准价等于该报价', () => {
            const calc = createCalc(
                { mode: 'single' },
                [{ name: 'A', price: 88 }]
            );
            expect(calc.baselinePrice).toBe(88);
        });

        it('多家报价相同且为最低价时，基准价为该值', () => {
            const calc = createCalc(
                { mode: 'single' },
                [
                    { name: 'A', price: 80 },
                    { name: 'B', price: 80 },
                    { name: 'C', price: 90 },
                ]
            );
            expect(calc.baselinePrice).toBe(80);
        });

        it('有废标时单低模式仅取有效报价中的最低价', () => {
            const calc = createCalc(
                { mode: 'single', minPrice: 50 },
                [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 40 },
                    { name: 'C', price: 60 },
                ]
            );
            expect(calc.baselinePrice).toBe(60);
        });

        it('小数报价的单低模式基准价精度正确', () => {
            const calc = createCalc(
                { mode: 'single' },
                [
                    { name: 'A', price: 99.99 },
                    { name: 'B', price: 88.88 },
                    { name: 'C', price: 77.77 },
                ]
            );
            expect(calc.baselinePrice).toBe(77.77);
        });
    });

    describe('双低模式 (mode=double)', () => {
        it('双低模式基准价 = 最低价×权重 + 平均价×(1-权重)', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 40 },
                [
                    { name: 'A', price: 80 },
                    { name: 'B', price: 100 },
                    { name: 'C', price: 120 },
                ]
            );
            const lowest = 80;
            const avg = (80 + 100 + 120) / 3;
            const expected = lowest * 0.4 + avg * 0.6;
            expect(calc.baselinePrice).toBeCloseTo(expected, 10);
        });

        it('最低价权重为 100% 时，双低模式退化为单低模式', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 100 },
                [
                    { name: 'A', price: 80 },
                    { name: 'B', price: 100 },
                    { name: 'C', price: 120 },
                ]
            );
            expect(calc.baselinePrice).toBe(80);
        });

        it('最低价权重为 0% 时，基准价 = 算术平均价', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 0 },
                [
                    { name: 'A', price: 80 },
                    { name: 'B', price: 100 },
                    { name: 'C', price: 120 },
                ]
            );
            expect(calc.baselinePrice).toBeCloseTo(100, 10);
        });

        it('权重为 50% 时基准价为最低价和平均价的中点', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 50 },
                [
                    { name: 'A', price: 80 },
                    { name: 'B', price: 100 },
                    { name: 'C', price: 120 },
                ]
            );
            expect(calc.baselinePrice).toBeCloseTo(90, 10);
        });

        it('只有一个有效报价时双低模式基准价等于该报价（最低=平均=该价）', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 40 },
                [{ name: 'A', price: 100 }]
            );
            expect(calc.baselinePrice).toBe(100);
        });

        it('所有有效报价相同时，基准价等于该报价', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 40 },
                [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 100 },
                    { name: 'C', price: 100 },
                ]
            );
            expect(calc.baselinePrice).toBe(100);
        });

        it('废标报价不参与双低模式基准价计算', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 40, maxPrice: 150, minPrice: 50 },
                [
                    { name: 'A', price: 80 },
                    { name: 'B', price: 100 },
                    { name: 'C', price: 200 },
                    { name: 'D', price: 40 },
                    { name: 'E', price: 120 },
                ]
            );
            const lowest = 80;
            const avg = (80 + 100 + 120) / 3;
            const expected = lowest * 0.4 + avg * 0.6;
            expect(calc.baselinePrice).toBeCloseTo(expected, 10);
        });

        it('双低模式下非整数权重（如30%）计算正确', () => {
            const calc = createCalc(
                { mode: 'double', lowestWeight: 30 },
                [
                    { name: 'A', price: 70 },
                    { name: 'B', price: 90 },
                    { name: 'C', price: 110 },
                ]
            );
            const expected = 70 * 0.3 + 90 * 0.7;
            expect(calc.baselinePrice).toBeCloseTo(expected, 10);
        });
    });

    describe('lowestValidPrice / averageValidPrice', () => {
        it('lowestValidPrice 返回有效报价中的最小值', () => {
            const calc = createCalc(
                { maxPrice: 100 },
                [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 50 },
                    { name: 'C', price: 75 },
                    { name: 'D', price: 200 },
                ]
            );
            expect(calc.lowestValidPrice).toBe(50);
        });

        it('averageValidPrice 返回有效报价的算术平均值', () => {
            const calc = createCalc(
                {},
                [
                    { name: 'A', price: 100 },
                    { name: 'B', price: 200 },
                    { name: 'C', price: 300 },
                ]
            );
            expect(calc.averageValidPrice).toBe(200);
        });

        it('averageValidPrice 处理小数精度', () => {
            const calc = createCalc(
                {},
                [
                    { name: 'A', price: 10 },
                    { name: 'B', price: 20 },
                    { name: 'C', price: 30 },
                ]
            );
            expect(calc.averageValidPrice).toBeCloseTo(20, 10);
        });
    });
});
