/**
 * 投标报价计算器 - 核心逻辑
 */
function bidCalculator() {
    return {
        // 配置参数
        config: {
            mode: 'single',        // 'single' 单低模式 | 'double' 双低模式
            maxPrice: null,        // 上限价（超出则废标）
            minPrice: null,        // 下限价（低于则废标）
            fullScore: 30,         // 价格分满分
            deductUp: 1.0,         // 上浮扣分系数（每高于基准价1%扣多少分）
            deductDown: 0.5,       // 下浮扣分系数（每低于基准价1%扣多少分，设为0表示低于不扣分）
            minScore: 0,           // 最低得分
            lowestWeight: 40,      // 双低模式下最低价权重(%)
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
         * - 超过上限价 → 废标
         * - 低于下限价 → 废标
         */
        checkValidity(price) {
            if (this.config.maxPrice !== null && this.config.maxPrice !== '' && price > this.config.maxPrice) {
                return { valid: false, reason: '超上限' };
            }
            if (this.config.minPrice !== null && this.config.minPrice !== '' && price < this.config.minPrice) {
                return { valid: false, reason: '低下限' };
            }
            return { valid: true, reason: '' };
        },

        /**
         * 获取所有有效报价
         */
        get validBids() {
            return this.bids.filter(bid => this.checkValidity(bid.price).valid);
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
            if (this.validBids.length === 0) return null;
            return Math.min(...this.validBids.map(b => b.price));
        },

        /**
         * 有效报价平均值
         */
        get averageValidPrice() {
            if (this.validBids.length === 0) return null;
            const sum = this.validBids.reduce((acc, b) => acc + b.price, 0);
            return sum / this.validBids.length;
        },

        /**
         * 计算评标基准价
         * - 单低模式：基准价 = 最低有效报价
         * - 双低模式：基准价 = 最低有效价 × A% + 平均有效价 × B%
         */
        get baselinePrice() {
            if (this.validBids.length === 0) return null;
            
            if (this.config.mode === 'single') {
                return this.lowestValidPrice;
            } else {
                const lowestWeight = this.config.lowestWeight / 100;
                const avgWeight = 1 - lowestWeight;
                return this.lowestValidPrice * lowestWeight + this.averageValidPrice * avgWeight;
            }
        },

        /**
         * 计算偏离率
         * 偏离率 = (报价 - 基准价) / 基准价 × 100%
         * 正值表示高于基准价，负值表示低于基准价
         */
        calculateDeviation(price) {
            if (!this.baselinePrice) return 0;
            return ((price - this.baselinePrice) / this.baselinePrice) * 100;
        },

        /**
         * 计算扣分
         * - 报价 > 基准价：扣分 = 偏离率 × 上浮扣分系数
         * - 报价 < 基准价：扣分 = |偏离率| × 下浮扣分系数
         * - 报价 = 基准价：扣分 = 0
         */
        calculateDeduction(price) {
            if (!this.baselinePrice) return 0;
            
            const deviation = this.calculateDeviation(price);
            
            if (deviation > 0) {
                return deviation * this.config.deductUp;
            } else if (deviation < 0) {
                return Math.abs(deviation) * this.config.deductDown;
            }
            return 0;
        },

        /**
         * 计算最终得分
         * 得分 = 满分 - 扣分
         * 最终得分不低于最低得分限制
         */
        calculateScore(price) {
            if (!this.baselinePrice) return 0;
            
            const deduction = this.calculateDeduction(price);
            let score = this.config.fullScore - deduction;
            
            score = Math.max(score, this.config.minScore);
            score = Math.min(score, this.config.fullScore);
            
            return score;
        },

        /**
         * 排序后的结果（按得分降序）
         */
        get sortedResults() {
            const results = this.bids.map(bid => {
                const validity = this.checkValidity(bid.price);
                const isValid = validity.valid;
                
                return {
                    id: bid.id,
                    name: bid.name,
                    price: bid.price,
                    isValid: isValid,
                    invalidReason: validity.reason,
                    deviation: isValid ? this.calculateDeviation(bid.price) : 0,
                    deduction: isValid ? this.calculateDeduction(bid.price) : 0,
                    score: isValid ? this.calculateScore(bid.price) : 0
                };
            });

            // 排序：有效报价在前，按得分降序；无效报价在后
            results.sort((a, b) => {
                if (a.isValid && !b.isValid) return -1;
                if (!a.isValid && b.isValid) return 1;
                if (!a.isValid && !b.isValid) return 0;
                if (b.score !== a.score) return b.score - a.score;
                return a.price - b.price;
            });

            // 添加排名（同分同名次）
            let rank = 0;
            let lastScore = null;
            let skipCount = 0;
            
            results.forEach((r, i) => {
                if (r.isValid) {
                    if (r.score !== lastScore) {
                        rank = rank + 1 + skipCount;
                        skipCount = 0;
                    } else {
                        skipCount++;
                    }
                    r.rank = rank;
                    lastScore = r.score;
                } else {
                    r.rank = null;
                }
            });

            return results;
        }
    }
}
