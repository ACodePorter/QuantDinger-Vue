/**
 * Polymarket预测市场API
 */
import request from '@/utils/request'

const BASE_URL = '/api/polymarket'

/**
 * 获取预测市场列表
 * @param {Object} params - 查询参数
 * @param {string} params.category - 类别筛选 (crypto/politics/economics/sports)
 * @param {string} params.sort_by - 排序方式 (volume_24h/ai_score/probability_change)
 * @param {number} params.limit - 数量限制
 */
export function getPolymarketMarkets (params = {}) {
  return request({
    url: `${BASE_URL}/markets`,
    method: 'get',
    params
  })
}

/**
 * 获取单个市场详情和AI分析
 * @param {string} marketId - 市场ID
 */
export function getPolymarketMarketDetail (marketId) {
  return request({
    url: `${BASE_URL}/markets/${marketId}`,
    method: 'get'
  })
}

/**
 * 获取基于该预测市场的资产交易机会
 * @param {string} marketId - 市场ID
 */
export function getPolymarketOpportunities (marketId) {
  return request({
    url: `${BASE_URL}/markets/${marketId}/opportunities`,
    method: 'get'
  })
}

/**
 * 获取AI推荐的高价值预测市场
 * @param {Object} params - 查询参数
 * @param {number} params.limit - 数量限制
 */
export function getPolymarketRecommendations (params = {}) {
  return request({
    url: `${BASE_URL}/recommendations`,
    method: 'get',
    params
  })
}

/**
 * 搜索预测市场
 * @param {Object} params - 查询参数
 * @param {string} params.q - 搜索关键词
 * @param {number} params.limit - 数量限制
 */
export function searchPolymarketMarkets (params) {
  return request({
    url: `${BASE_URL}/search`,
    method: 'get',
    params
  })
}
