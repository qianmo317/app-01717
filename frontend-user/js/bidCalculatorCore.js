/**
 * 投标报价计算器 - 核心计算逻辑
 * 纯函数，便于单元测试
 */

/**
 * 默认配置
 */
const defaultConfig = {
    mode: 'single',
    maxPrice: null,
    minPrice: null,
    fullScore: 30,
    deductUp: 1.0,
    deductDown: 0.5,
    minScore: 0,
    lowestWeight: 40,
};

/**
 * 检查报价是否有效（限价判断）
 * @param {number} price - 报价
 * @param {object} config - 配置对象
 * @returns {object} { valid: boolean, reason: string }
 */
function checkValidity(price, config) {
    const cfg = { ...defaultConfig, ...config };
    
    if (cfg.maxPrice !== null && cfg.maxPrice !== '' && price > cfg.maxPrice) {
        return { valid: false, reason: '超上限' };
    }
    if (cfg.minPrice !== null && cfg.minPrice !== '' && price < cfg.minPrice) {
        return { valid: false, reason: '低下限' };
    }
    return { valid: true, reason: '' };
}

/**
 * 获取所有有效报价
 * @param {Array} bids - 报价列表
 * @param {object} config - 配置对象
 * @returns {Array} 有效报价列表
 */
function getValidBids(bids, config) {
    return bids.filter(bid => checkValidity(bid.price, config).valid);
}

/**
 * 获取最低有效报价
 * @param {Array} bids - 报价列表
 * @param {object} config - 配置对象
 * @returns {number|null} 最低有效报价
 */
function getLowestValidPrice(bids, config) {
    const validBids = getValidBids(bids, config);
    if (validBids.length === 0) return null;
    return Math.min(...validBids.map(b => b.price));
}

/**
 * 获取有效报价平均值
 * @param {Array} bids - 报价列表
 * @param {object} config - 配置对象
 * @returns {number|null} 平均有效报价
 */
function getAverageValidPrice(bids, config) {
    const validBids = getValidBids(bids, config);
    if (validBids.length === 0) return null;
    const sum = validBids.reduce((acc, b) => acc + b.price, 0);
    return sum / validBids.length;
}

/**
 * 计算评标基准价
 * - 单低模式：基准价 = 最低有效报价
 * - 双低模式：基准价 = 最低有效价 × A% + 平均有效价 × B%
 * @param {Array} bids - 报价列表
 * @param {object} config - 配置对象
 * @returns {number|null} 基准价
 */
function calculateBaselinePrice(bids, config) {
    const cfg = { ...defaultConfig, ...config };
    const validBids = getValidBids(bids, config);
    
    if (validBids.length === 0) return null;
    
    if (cfg.mode === 'single') {
        return getLowestValidPrice(bids, config);
    } else {
        const lowestWeight = cfg.lowestWeight / 100;
        const avgWeight = 1 - lowestWeight;
        return getLowestValidPrice(bids, config) * lowestWeight + getAverageValidPrice(bids, config) * avgWeight;
    }
}

/**
 * 计算偏离率
 * 偏离率 = (报价 - 基准价) / 基准价 × 100%
 * 正值表示高于基准价，负值表示低于基准价
 * @param {number} price - 报价
 * @param {number} baselinePrice - 基准价
 * @returns {number} 偏离率(%)
 */
function calculateDeviation(price, baselinePrice) {
    if (!baselinePrice) return 0;
    return ((price - baselinePrice) / baselinePrice) * 100;
}

/**
 * 计算扣分
 * - 报价 > 基准价：扣分 = 偏离率 × 上浮扣分系数
 * - 报价 < 基准价：扣分 = |偏离率| × 下浮扣分系数
 * - 报价 = 基准价：扣分 = 0
 * @param {number} price - 报价
 * @param {number} baselinePrice - 基准价
 * @param {object} config - 配置对象
 * @returns {number} 扣分
 */
function calculateDeduction(price, baselinePrice, config) {
    const cfg = { ...defaultConfig, ...config };
    
    if (!baselinePrice) return 0;
    
    const deviation = calculateDeviation(price, baselinePrice);
    
    if (deviation > 0) {
        return deviation * cfg.deductUp;
    } else if (deviation < 0) {
        return Math.abs(deviation) * cfg.deductDown;
    }
    return 0;
}

/**
 * 计算最终得分
 * 得分 = 满分 - 扣分
 * 最终得分不低于最低得分限制
 * @param {number} price - 报价
 * @param {number} baselinePrice - 基准价
 * @param {object} config - 配置对象
 * @returns {number} 最终得分
 */
function calculateScore(price, baselinePrice, config) {
    const cfg = { ...defaultConfig, ...config };
    
    if (!baselinePrice) return 0;
    
    const deduction = calculateDeduction(price, baselinePrice, config);
    let score = cfg.fullScore - deduction;
    
    score = Math.max(score, cfg.minScore);
    score = Math.min(score, cfg.fullScore);
    
    return score;
}

/**
 * 获取排序后的结果（按得分降序）
 * @param {Array} bids - 报价列表
 * @param {object} config - 配置对象
 * @returns {Array} 排序后的结果列表
 */
function getSortedResults(bids, config) {
    const cfg = { ...defaultConfig, ...config };
    const baselinePrice = calculateBaselinePrice(bids, config);
    
    const results = bids.map(bid => {
        const validity = checkValidity(bid.price, cfg);
        const isValid = validity.valid;
        
        return {
            id: bid.id,
            name: bid.name,
            price: bid.price,
            isValid: isValid,
            invalidReason: validity.reason,
            deviation: isValid ? calculateDeviation(bid.price, baselinePrice) : 0,
            deduction: isValid ? calculateDeduction(bid.price, baselinePrice, cfg) : 0,
            score: isValid ? calculateScore(bid.price, baselinePrice, cfg) : 0
        };
    });

    results.sort((a, b) => {
        if (a.isValid && !b.isValid) return -1;
        if (!a.isValid && b.isValid) return 1;
        if (!a.isValid && !b.isValid) return 0;
        if (b.score !== a.score) return b.score - a.score;
        return a.price - b.price;
    });

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

export {
    defaultConfig,
    checkValidity,
    getValidBids,
    getLowestValidPrice,
    getAverageValidPrice,
    calculateBaselinePrice,
    calculateDeviation,
    calculateDeduction,
    calculateScore,
    getSortedResults,
};
