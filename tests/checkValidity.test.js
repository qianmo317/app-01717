/**
 * 报价有效性判断（checkValidity）测试
 * 覆盖：上限、下限、未配置、边界、异常输入
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { bidCalculator } from './_helpers/loadCalculator.js';

describe('checkValidity - 报价有效性判断', () => {
    let calc;

    beforeEach(() => {
        calc = bidCalculator();
    });

    describe('正常情况', () => {
        it('未配置上下限时，任意正数报价均有效', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = null;
            expect(calc.checkValidity(100).valid).toBe(true);
            expect(calc.checkValidity(0.01).valid).toBe(true);
            expect(calc.checkValidity(99999999).valid).toBe(true);
        });

        it('报价在上下限区间内有效', () => {
            calc.config.maxPrice = 1000;
            calc.config.minPrice = 500;
            const result = calc.checkValidity(800);
            expect(result.valid).toBe(true);
            expect(result.reason).toBe('');
        });

        it('仅设置上限，低于上限有效', () => {
            calc.config.maxPrice = 1000;
            calc.config.minPrice = null;
            expect(calc.checkValidity(999).valid).toBe(true);
        });

        it('仅设置下限，高于下限有效', () => {
            calc.config.maxPrice = null;
            calc.config.minPrice = 500;
            expect(calc.checkValidity(501).valid).toBe(true);
        });
    });

    describe('边界情况', () => {
        it('报价等于上限价应有效（仅 > 才废标）', () => {
            calc.config.maxPrice = 1000;
            expect(calc.checkValidity(1000).valid).toBe(true);
        });

        it('报价等于下限价应有效（仅 < 才废标）', () => {
            calc.config.minPrice = 500;
            expect(calc.checkValidity(500).valid).toBe(true);
        });

        it('上限与下限相等时，仅等值有效', () => {
            calc.config.maxPrice = 800;
            calc.config.minPrice = 800;
            expect(calc.checkValidity(800).valid).toBe(true);
            expect(calc.checkValidity(799.99).valid).toBe(false);
            expect(calc.checkValidity(800.01).valid).toBe(false);
        });
    });

    describe('异常情况（废标）', () => {
        it('超过上限价 → 废标，原因为 "超上限"', () => {
            calc.config.maxPrice = 1000;
            const result = calc.checkValidity(1000.01);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('超上限');
        });

        it('低于下限价 → 废标，原因为 "低下限"', () => {
            calc.config.minPrice = 500;
            const result = calc.checkValidity(499.99);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('低下限');
        });

        it('同时超出上下限时，按代码顺序优先返回 "超上限"', () => {
            // 当 maxPrice < minPrice 且 price > maxPrice 时
            calc.config.maxPrice = 100;
            calc.config.minPrice = 200;
            const result = calc.checkValidity(150);
            // 150 > 100 → 先命中超上限分支
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('超上限');
        });

        it('上限价为空字符串应被视为未配置', () => {
            calc.config.maxPrice = '';
            calc.config.minPrice = null;
            expect(calc.checkValidity(99999).valid).toBe(true);
        });

        it('下限价为空字符串应被视为未配置', () => {
            calc.config.minPrice = '';
            calc.config.maxPrice = null;
            expect(calc.checkValidity(0.01).valid).toBe(true);
        });
    });

    describe('与 validBids 派生属性联动', () => {
        it('过滤掉无效报价后，validBids 仅包含有效项', () => {
            calc.config.maxPrice = 1000;
            calc.config.minPrice = 500;
            calc.bids = [
                { id: 1, name: 'A', price: 400 }, // 低下限
                { id: 2, name: 'B', price: 600 }, // 有效
                { id: 3, name: 'C', price: 1100 }, // 超上限
                { id: 4, name: 'D', price: 800 }, // 有效
            ];
            expect(calc.validBidsCount).toBe(2);
            expect(calc.validBids.map(b => b.id)).toEqual([2, 4]);
        });

        it('全部废标时 validBidsCount 为 0', () => {
            calc.config.maxPrice = 100;
            calc.bids = [
                { id: 1, name: 'A', price: 200 },
                { id: 2, name: 'B', price: 300 },
            ];
            expect(calc.validBidsCount).toBe(0);
        });
    });
});
