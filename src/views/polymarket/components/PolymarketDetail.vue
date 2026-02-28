<template>
  <div class="polymarket-detail">
    <a-spin :spinning="loading">
      <div v-if="marketData">
        <!-- 市场基本信息 -->
        <a-card :bordered="false" class="detail-section">
          <div class="market-header">
            <div class="market-category">
              <a-tag :color="getCategoryColor(marketData.market.category)">
                {{ getCategoryLabel(marketData.market.category) }}
              </a-tag>
            </div>
            <div class="market-status">
              <a-tag :color="getStatusColor(marketData.market.status)">
                {{ getStatusLabel(marketData.market.status) }}
              </a-tag>
            </div>
          </div>

          <div class="market-question-header">
            <h3 class="market-question">{{ marketData.market.question }}</h3>
            <a-button
              v-if="marketData.market.polymarket_url"
              type="link"
              icon="link"
              :href="marketData.market.polymarket_url"
              target="_blank"
              style="margin-left: 12px;"
            >
              {{ $t('polymarket.viewOnPolymarket') }}
            </a-button>
          </div>

          <div class="market-stats">
            <a-row :gutter="16">
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-label">{{ $t('polymarket.detail.currentProbability') }}</div>
                  <div class="stat-value">{{ marketData.market.current_probability.toFixed(1) }}%</div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-label">{{ $t('polymarket.detail.volume24h') }}</div>
                  <div class="stat-value">${{ formatVolume(marketData.market.volume_24h) }}</div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="stat-item">
                  <div class="stat-label">{{ $t('polymarket.detail.liquidity') }}</div>
                  <div class="stat-value">${{ formatVolume(marketData.market.liquidity) }}</div>
                </div>
              </a-col>
            </a-row>
          </div>

          <a-progress
            :percent="marketData.market.current_probability"
            :stroke-color="getProbabilityColor(marketData.market.current_probability)"
            :stroke-width="12"
          />
        </a-card>

        <!-- AI分析结果 -->
        <a-card
          v-if="marketData.ai_analysis && !marketData.ai_analysis.error"
          :bordered="false"
          class="detail-section"
          :title="$t('polymarket.detail.aiAnalysis')"
        >
          <div class="ai-analysis-content">
            <a-row :gutter="24">
              <a-col :span="12">
                <div class="ai-metric">
                  <div class="metric-label">{{ $t('polymarket.ai.marketProbability') }}</div>
                  <div class="metric-value">{{ marketData.ai_analysis.market_probability.toFixed(1) }}%</div>
                </div>
              </a-col>
              <a-col :span="12">
                <div class="ai-metric">
                  <div class="metric-label">{{ $t('polymarket.ai.predicted') }}</div>
                  <div class="metric-value" :class="getDivergenceClass(marketData.ai_analysis.divergence)">
                    {{ marketData.ai_analysis.ai_predicted_probability.toFixed(1) }}%
                  </div>
                </div>
              </a-col>
            </a-row>

            <a-divider />

            <div class="ai-recommendation">
              <div class="recommendation-header">
                <span class="recommendation-label">{{ $t('polymarket.ai.recommendation') }}</span>
                <a-tag :color="getRecommendationColor(marketData.ai_analysis.recommendation)" size="large">
                  {{ getRecommendationLabel(marketData.ai_analysis.recommendation) }}
                </a-tag>
              </div>
              <div class="recommendation-scores">
                <div class="score-item">
                  <span class="score-label">{{ $t('polymarket.ai.confidence') }}</span>
                  <a-progress
                    :percent="marketData.ai_analysis.confidence_score"
                    :stroke-color="getScoreColor(marketData.ai_analysis.confidence_score)"
                    :show-info="true"
                    :format="percent => `${percent}%`"
                  />
                </div>
                <div class="score-item">
                  <span class="score-label">{{ $t('polymarket.ai.opportunityScore') }}</span>
                  <a-progress
                    :percent="marketData.ai_analysis.opportunity_score"
                    :stroke-color="getScoreColor(marketData.ai_analysis.opportunity_score)"
                    :show-info="true"
                    :format="percent => `${percent}%`"
                  />
                </div>
              </div>
            </div>

            <a-divider />

            <div class="ai-reasoning">
              <h4>{{ $t('polymarket.ai.reasoning') }}</h4>
              <p>{{ marketData.ai_analysis.reasoning }}</p>
            </div>

            <div class="ai-factors" v-if="marketData.ai_analysis.key_factors && marketData.ai_analysis.key_factors.length > 0">
              <h4>{{ $t('polymarket.ai.keyFactors') }}</h4>
              <ul>
                <li v-for="(factor, idx) in marketData.ai_analysis.key_factors" :key="idx">{{ factor }}</li>
              </ul>
            </div>
          </div>
        </a-card>

        <!-- 相关资产交易机会 -->
        <a-card
          v-if="marketData.asset_opportunities && marketData.asset_opportunities.length > 0"
          :bordered="false"
          class="detail-section"
          :title="$t('polymarket.detail.assetOpportunities')"
        >
          <a-list
            :data-source="marketData.asset_opportunities"
            :pagination="false"
          >
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <div slot="title">
                  <a-tag :color="getSignalColor(item.signal)">{{ getSignalLabel(item.signal) }}</a-tag>
                  <span style="margin-left: 8px; font-weight: 500;">{{ item.asset }}</span>
                </div>
                <div slot="description">
                  <div style="margin-bottom: 4px;">
                    <span style="color: rgba(0,0,0,0.45);">{{ $t('polymarket.opportunity.confidence') }}: </span>
                    <span style="font-weight: 500;">{{ item.confidence.toFixed(1) }}%</span>
                  </div>
                  <div>{{ item.reasoning }}</div>
                </div>
              </a-list-item-meta>
              <div slot="actions">
                <a-button type="link" size="small" @click="analyzeAsset(item.asset, item.market)">
                  {{ $t('polymarket.opportunity.analyze') }}
                </a-button>
              </div>
            </a-list-item>
          </a-list>
        </a-card>
      </div>

      <a-empty v-else-if="!loading" :description="$t('polymarket.error.notFound')" />
    </a-spin>
  </div>
</template>

<script>
import { getPolymarketMarketDetail } from '@/api/polymarket'

export default {
  name: 'PolymarketDetail',
  props: {
    marketId: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      loading: false,
      marketData: null
    }
  },
  created () {
    this.loadDetail()
  },
  watch: {
    marketId () {
      this.loadDetail()
    }
  },
  methods: {
    async loadDetail () {
      this.loading = true
      try {
        const res = await getPolymarketMarketDetail(this.marketId)
        if (res && res.code === 1 && res.data) {
          this.marketData = res.data
        }
      } catch (e) {
        console.error('Load market detail failed:', e)
        this.$message.error(this.$t('polymarket.error.loadDetailFailed'))
      } finally {
        this.loading = false
      }
    },
    getCategoryColor (category) {
      const colors = {
        crypto: 'blue',
        politics: 'red',
        economics: 'orange',
        sports: 'green'
      }
      return colors[category] || 'default'
    },
    getCategoryLabel (category) {
      return this.$t(`polymarket.category.${category}`)
    },
    getStatusColor (status) {
      const colors = {
        active: 'green',
        closed: 'default',
        resolved: 'blue'
      }
      return colors[status] || 'default'
    },
    getStatusLabel (status) {
      return this.$t(`polymarket.status.${status}`)
    },
    getProbabilityColor (prob) {
      if (prob > 70) return '#52c41a'
      if (prob > 50) return '#1890ff'
      if (prob > 30) return '#faad14'
      return '#ff4d4f'
    },
    getDivergenceClass (divergence) {
      if (Math.abs(divergence) > 10) return 'high-divergence'
      if (Math.abs(divergence) > 5) return 'medium-divergence'
      return ''
    },
    getRecommendationColor (rec) {
      const colors = {
        YES: 'green',
        NO: 'red',
        HOLD: 'default'
      }
      return colors[rec] || 'default'
    },
    getRecommendationLabel (rec) {
      return this.$t(`polymarket.recommendation.${rec}`)
    },
    getScoreColor (score) {
      if (score > 80) return '#52c41a'
      if (score > 60) return '#1890ff'
      if (score > 40) return '#faad14'
      return '#ff4d4f'
    },
    getSignalColor (signal) {
      const colors = {
        BUY: 'green',
        SELL: 'red',
        HOLD: 'default'
      }
      return colors[signal] || 'default'
    },
    getSignalLabel (signal) {
      return this.$t(`polymarket.signal.${signal}`)
    },
    formatVolume (volume) {
      if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + 'M'
      }
      if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'K'
      }
      return volume.toFixed(0)
    },
    analyzeAsset (asset, market) {
      // 跳转到AI分析页面
      this.$router.push({
        path: '/ai-asset-analysis',
        query: { symbol: asset, market }
      })
      this.$emit('close')
    }
  }
}
</script>

<style lang="less" scoped>
.polymarket-detail {
  .detail-section {
    margin-bottom: 16px;

    .market-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .market-question {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .market-stats {
      margin-bottom: 16px;

      .stat-item {
        text-align: center;

        .stat-label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.85);
        }
      }
    }

    .ai-analysis-content {
      .ai-metric {
        text-align: center;
        padding: 16px;
        background: #fafafa;
        border-radius: 4px;

        .metric-label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.85);

          &.high-divergence {
            color: #52c41a;
          }

          &.medium-divergence {
            color: #1890ff;
          }
        }
      }

      .ai-recommendation {
        .recommendation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;

          .recommendation-label {
            font-size: 16px;
            font-weight: 500;
          }
        }

        .recommendation-scores {
          .score-item {
            margin-bottom: 12px;

            .score-label {
              display: block;
              font-size: 12px;
              color: rgba(0, 0, 0, 0.45);
              margin-bottom: 4px;
            }
          }
        }
      }

      .ai-reasoning,
      .ai-factors {
        margin-top: 16px;

        h4 {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        p {
          color: rgba(0, 0, 0, 0.65);
          line-height: 1.6;
        }

        ul {
          margin: 0;
          padding-left: 20px;

          li {
            color: rgba(0, 0, 0, 0.65);
            line-height: 1.6;
            margin-bottom: 4px;
          }
        }
      }
    }
  }
}
</style>
