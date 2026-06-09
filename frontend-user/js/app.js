/**
 * 投标报价计算器 - Alpine.js 组件
 * 核心计算逻辑委托给 bidCalculatorCore.js
 */
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
} from './bidCalculatorCore.js';

function bidCalculator() {
    return {
        // 配置参数
        config: {
            mode: 'single',
            maxPrice: null,
            minPrice: null,
            fullScore: 30,
            deductUp: 1.0,
            deductDown: 0.5,
            minScore: 0,
            lowestWeight: 40,
        },
        
        // 投标报价列表
        bids: [],
        
        // 新增报价表单
        newBid: {
            name: '',
            price: null
        },
        
        // 报价ID计数器
        bidIdCounter: 0,

        /**
         * 添加报价
         */
        addBid() {
            if (!this.newBid.name || !this.newBid.price || this.newBid.price <= 0) return;
            
            this.bids.push({
                id: ++this.bidIdCounter,
                name: this.newBid.name.trim(),
                price: parseFloat(this.newBid.price)
            });
            
            this.newBid = { name: '', price: null };
        },

        /**
         * 删除报价
         */
        removeBid(id) {
            this.bids = this.bids.filter(b => b.id !== id);
        },

        /**
         * 清空所有报价
         */
        clearBids() {
            this.bids = [];
        },

        /**
         * 检查报价是否有效（限价判断）
         */
        checkValidity(price) {
            return checkValidity(price, this.config);
        },

        /**
         * 获取所有有效报价
         */
        get validBids() {
            return getValidBids(this.bids, this.config);
        },

        /**
         * 有效报价数量
         */
        get validBidsCount() {
            return this.validBids.length;
        },

        /**
         * 最低有效报价
         */
        get lowestValidPrice() {
            return getLowestValidPrice(this.bids, this.config);
        },

        /**
         * 有效报价平均值
         */
        get averageValidPrice() {
            return getAverageValidPrice(this.bids, this.config);
        },

        /**
         * 计算评标基准价
         */
        get baselinePrice() {
            return calculateBaselinePrice(this.bids, this.config);
        },

        /**
         * 计算偏离率
         */
        calculateDeviation(price) {
            return calculateDeviation(price, this.baselinePrice);
        },

        /**
         * 计算扣分
         */
        calculateDeduction(price) {
            return calculateDeduction(price, this.baselinePrice, this.config);
        },

        /**
         * 计算最终得分
         */
        calculateScore(price) {
            return calculateScore(price, this.baselinePrice, this.config);
        },

        /**
         * 排序后的结果（按得分降序）
         */
        get sortedResults() {
            return getSortedResults(this.bids, this.config);
        }
    }
}

window.bidCalculator = bidCalculator;
