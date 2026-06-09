const { createCalc } = require('./helpers.js');

describe('checkValidity - 报价有效性判断', () => {

    describe('正常情况', () => {
        it('未设置任何限价时，任意正价报价均有效', () => {
            const calc = createCalc();
            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(0.01)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(999999)).toEqual({ valid: true, reason: '' });
        });

        it('只设上限价，报价低于上限价时有效', () => {
            const calc = createCalc({ maxPrice: 100 });
            expect(calc.checkValidity(99)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(50)).toEqual({ valid: true, reason: '' });
        });

        it('只设下限价，报价高于下限价时有效', () => {
            const calc = createCalc({ minPrice: 50 });
            expect(calc.checkValidity(51)).toEqual({ valid: true, reason: '' });
            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
        });

        it('同时设上下限价，报价在区间内时有效', () => {
            const calc = createCalc({ maxPrice: 100, minPrice: 50 });
            expect(calc.checkValidity(75)).toEqual({ valid: true, reason: '' });
        });
    });

    describe('边界情况', () => {
        it('报价等于上限价时有效（边界值，不算超上限）', () => {
            const calc = createCalc({ maxPrice: 100 });
            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
        });

        it('报价等于下限价时有效（边界值，不算低下限）', () => {
            const calc = createCalc({ minPrice: 50 });
            expect(calc.checkValidity(50)).toEqual({ valid: true, reason: '' });
        });

        it('报价同时等于上下限价（上下限相同）时有效', () => {
            const calc = createCalc({ maxPrice: 100, minPrice: 100 });
            expect(calc.checkValidity(100)).toEqual({ valid: true, reason: '' });
        });

        it('上限价为 null 时不触发上限校验', () => {
            const calc = createCalc({ maxPrice: null, minPrice: 50 });
            expect(calc.checkValidity(999999)).toEqual({ valid: true, reason: '' });
        });

        it('上限价为空字符串时不触发上限校验', () => {
            const calc = createCalc({ maxPrice: '' });
            expect(calc.checkValidity(999999)).toEqual({ valid: true, reason: '' });
        });

        it('下限价为 null 时不触发下限校验', () => {
            const calc = createCalc({ maxPrice: 100, minPrice: null });
            expect(calc.checkValidity(0.01)).toEqual({ valid: true, reason: '' });
        });

        it('下限价为空字符串时不触发下限校验', () => {
            const calc = createCalc({ minPrice: '' });
            expect(calc.checkValidity(0.01)).toEqual({ valid: true, reason: '' });
        });
    });

    describe('异常/废标情况', () => {
        it('报价超过上限价时返回超上限废标', () => {
            const calc = createCalc({ maxPrice: 100 });
            expect(calc.checkValidity(101)).toEqual({ valid: false, reason: '超上限' });
            expect(calc.checkValidity(100.01)).toEqual({ valid: false, reason: '超上限' });
        });

        it('报价低于下限价时返回低下限废标', () => {
            const calc = createCalc({ minPrice: 50 });
            expect(calc.checkValidity(49)).toEqual({ valid: false, reason: '低下限' });
            expect(calc.checkValidity(49.99)).toEqual({ valid: false, reason: '低下限' });
        });

        it('报价远高于上限价时仍正确判定为废标', () => {
            const calc = createCalc({ maxPrice: 100 });
            expect(calc.checkValidity(1000000)).toEqual({ valid: false, reason: '超上限' });
        });

        it('报价远低于下限价时仍正确判定为废标', () => {
            const calc = createCalc({ minPrice: 50 });
            expect(calc.checkValidity(0.0001)).toEqual({ valid: false, reason: '低下限' });
        });

        it('限价区间设置中，低于下限正确标记为低下限而非超上限', () => {
            const calc = createCalc({ maxPrice: 100, minPrice: 50 });
            const result = calc.checkValidity(40);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('低下限');
        });

        it('限价区间设置中，高于上限正确标记为超上限而非低下限', () => {
            const calc = createCalc({ maxPrice: 100, minPrice: 50 });
            const result = calc.checkValidity(110);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('超上限');
        });
    });

    describe('validBids 集成 - 有效报价过滤', () => {
        it('无报价时 validBids 返回空数组', () => {
            const calc = createCalc({ maxPrice: 100, minPrice: 50 });
            expect(calc.validBids).toEqual([]);
            expect(calc.validBidsCount).toBe(0);
        });

        it('混合有效和无效报价时，只返回有效报价', () => {
            const calc = createCalc(
                { maxPrice: 100, minPrice: 50 },
                [
                    { name: 'A', price: 75 },
                    { name: 'B', price: 101 },
                    { name: 'C', price: 49 },
                    { name: 'D', price: 100 },
                    { name: 'E', price: 50 },
                ]
            );
            const validPrices = calc.validBids.map(function(b) { return b.price; });
            expect(validPrices).toEqual([75, 100, 50]);
            expect(calc.validBidsCount).toBe(3);
        });

        it('所有报价都无效时 validBids 返回空数组', () => {
            const calc = createCalc(
                { maxPrice: 100, minPrice: 50 },
                [
                    { name: 'A', price: 101 },
                    { name: 'B', price: 49 },
                ]
            );
            expect(calc.validBids).toEqual([]);
            expect(calc.validBidsCount).toBe(0);
        });
    });
});
