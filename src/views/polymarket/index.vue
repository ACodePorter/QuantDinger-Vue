<template>
  <div class="polymarket-page" :class="{ 'theme-dark': isDarkTheme }">
    <a-card :bordered="false" class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">
            <a-icon type="radar-chart" />
            {{ $t('polymarket.title') }}
          </h2>
          <p class="page-subtitle">{{ $t('polymarket.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <a-button type="primary" icon="reload" :loading="loading" @click="loadMarkets(true)">
            {{ $t('common.refresh') }}
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- 分类Tab -->
    <a-card :bordered="false" class="category-tabs-card">
      <a-radio-group v-model="filters.category" @change="handleFilterChange" button-style="solid" size="large">
        <a-radio-button value="">{{ $t('polymarket.category.all') }}</a-radio-button>
        <a-radio-button value="crypto">{{ $t('polymarket.category.crypto') }}</a-radio-button>
        <a-radio-button value="politics">{{ $t('polymarket.category.politics') }}</a-radio-button>
        <a-radio-button value="economics">{{ $t('polymarket.category.economics') }}</a-radio-button>
        <a-radio-button value="sports">{{ $t('polymarket.category.sports') }}</a-radio-button>
        <a-radio-button value="tech">{{ $t('polymarket.category.tech') }}</a-radio-button>
        <a-radio-button value="finance">{{ $t('polymarket.category.finance') }}</a-radio-button>
        <a-radio-button value="geopolitics">{{ $t('polymarket.category.geopolitics') }}</a-radio-button>
        <a-radio-button value="culture">{{ $t('polymarket.category.culture') }}</a-radio-button>
        <a-radio-button value="climate">{{ $t('polymarket.category.climate') }}</a-radio-button>
        <a-radio-button value="entertainment">{{ $t('polymarket.category.entertainment') }}</a-radio-button>
      </a-radio-group>
    </a-card>

    <!-- 筛选和搜索 -->
    <a-card :bordered="false" class="filter-card">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12" :md="12">
          <a-select
            v-model="filters.sort_by"
            :placeholder="$t('polymarket.filter.sortBy')"
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option value="volume_24h">{{ $t('polymarket.sort.volume') }}</a-select-option>
            <a-select-option value="ai_score">{{ $t('polymarket.sort.aiScore') }}</a-select-option>
            <a-select-option value="high_probability">{{ $t('polymarket.sort.highProbability') }}</a-select-option>
            <a-select-option value="high_return">{{ $t('polymarket.sort.highReturn') }}</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="12">
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('polymarket.search.placeholder')"
            enter-button
            @search="handleSearch"
          />
        </a-col>
      </a-row>

    </a-card>

    <!-- 市场列表 -->
    <a-spin :spinning="loading">
      <div class="markets-grid" v-if="markets.length > 0">
        <a-card
          v-for="market in markets"
          :key="market.market_id"
          :bordered="false"
          class="market-card"
          :class="getMarketCardClass(market)"
        >
          <div class="market-card-header">
            <div class="market-category">
              <a-tag :color="getCategoryColor(market.category)">
                {{ getCategoryLabel(market.category) }}
              </a-tag>
            </div>
            <div class="market-volume" v-if="market.volume_24h">
              <a-icon type="dollar" />
              {{ formatVolume(market.volume_24h) }}
            </div>
          </div>

          <div class="market-question">
            {{ market.question }}
          </div>

          <div class="market-probability">
            <div class="prob-main">
              <span class="prob-label">{{ $t('polymarket.market.currentProbability') }}</span>
              <span class="prob-value">{{ market.current_probability.toFixed(1) }}%</span>
            </div>
            <a-progress
              :percent="market.current_probability"
              :stroke-color="getProbabilityColor(market.current_probability)"
              :show-info="false"
              :stroke-width="8"
            />
          </div>

          <!-- AI分析结果 -->
          <div class="market-ai-analysis" v-if="market.ai_analysis">
            <a-divider style="margin: 12px 0;" />
            <div class="ai-result">
              <div class="ai-item">
                <span class="ai-label">{{ $t('polymarket.ai.predicted') }}</span>
                <span class="ai-value" :class="getDivergenceClass(market.ai_analysis.divergence)">
                  {{ market.ai_analysis.predicted_probability.toFixed(1) }}%
                </span>
              </div>
              <div class="ai-item">
                <span class="ai-label">{{ $t('polymarket.ai.recommendation') }}</span>
                <a-tag :color="getRecommendationColor(market.ai_analysis.recommendation)">
                  {{ getRecommendationLabel(market.ai_analysis.recommendation) }}
                </a-tag>
              </div>
              <div class="ai-item">
                <span class="ai-label">{{ $t('polymarket.ai.opportunityScore') }}</span>
                <a-rate
                  :value="market.ai_analysis.opportunity_score / 20"
                  disabled
                  allow-half
                  style="font-size: 12px;"
                />
                <span class="ai-score">{{ market.ai_analysis.opportunity_score.toFixed(0) }}</span>
              </div>
            </div>
          </div>

          <div class="market-footer">
            <a-button
              type="link"
              size="small"
              @click.stop="openPolymarket(market)"
            >
              {{ $t('polymarket.action.viewOnPolymarket') }}
              <a-icon type="external-link" />
            </a-button>
          </div>
        </a-card>
      </div>

      <a-empty v-else :description="$t('common.noData')" />
    </a-spin>

  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getPolymarketMarkets, searchPolymarketMarkets } from '@/api/polymarket'

export default {
  name: 'PolymarketPage',
  data () {
    return {
      loading: false,
      markets: [],
      filters: {
        category: null,
        sort_by: 'volume_24h'
      },
      searchKeyword: ''
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    }
  },
  created () {
    this.loadMarkets()
    // 如果URL中有marketId参数，打开详情弹窗
    if (this.$route.query.marketId) {
      this.$nextTick(() => {
        this.viewMarketDetail(this.$route.query.marketId)
      })
    }
  },
  methods: {
    async loadMarkets (force = false) {
      this.loading = true
      try {
        const params = {
          limit: 20
        }
        // 只有当选择了具体分类时才传递category参数
        if (this.filters.category) {
          params.category = this.filters.category
        }
        if (this.filters.sort_by) {
          params.sort_by = this.filters.sort_by
        }
        const res = await getPolymarketMarkets(params)
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.markets = res.data
          // 显示统计信息
          if (res.total_opportunities !== undefined) {
            console.log(`Found ${res.total_opportunities} opportunities out of ${res.total_markets} total markets`)
          }
        } else {
          this.markets = []
        }
      } catch (e) {
        console.error('Load markets failed:', e)
        this.$message.error(this.$t('polymarket.error.loadFailed'))
        this.markets = []
      } finally {
        this.loading = false
      }
    },
    async handleSearch () {
      if (!this.searchKeyword.trim()) {
        this.loadMarkets()
        return
      }
      this.loading = true
      try {
        const res = await searchPolymarketMarkets({
          q: this.searchKeyword,
          limit: 20
        })
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.markets = res.data
        }
      } catch (e) {
        console.error('Search markets failed:', e)
        this.$message.error(this.$t('polymarket.error.searchFailed'))
      } finally {
        this.loading = false
      }
    },
    handleFilterChange () {
      this.loadMarkets()
    },
    openPolymarket (market) {
      // 优先使用polymarket_url（后端已经构建好的正确URL）
      let url = market.polymarket_url

      // 如果没有polymarket_url，尝试从slug构建（但slug不能是数字）
      if (!url && market.slug && !/^\d+$/.test(market.slug)) {
        url = `https://polymarket.com/event/${market.slug}`
      }

      // 如果还是没有，使用markets端点（不推荐，但至少能访问）
      if (!url) {
        url = `https://polymarket.com/markets/${market.market_id}`
      }

      window.open(url, '_blank')
    },
    getCategoryColor (category) {
      const colors = {
        crypto: 'blue',
        politics: 'red',
        economics: 'orange',
        sports: 'green',
        tech: 'purple',
        finance: 'cyan',
        geopolitics: 'volcano',
        culture: 'magenta',
        climate: 'lime',
        entertainment: 'gold'
      }
      return colors[category] || 'default'
    },
    getCategoryLabel (category) {
      return this.$t(`polymarket.category.${category}`)
    },
    getProbabilityColor (prob) {
      if (prob > 70) return '#52c41a'
      if (prob > 50) return '#1890ff'
      if (prob > 30) return '#faad14'
      return '#ff4d4f'
    },
    getMarketCardClass (market) {
      if (!market.ai_analysis) return ''
      const score = market.ai_analysis.opportunity_score
      if (score > 85) return 'high-opportunity'
      if (score > 75) return 'medium-opportunity'
      return ''
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
    formatVolume (volume) {
      if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + 'M'
      }
      if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'K'
      }
      return volume.toFixed(0)
    }
  }
}
</script>

<style lang="less" scoped>
.polymarket-page {
  padding: 24px;
  min-height: 100vh;
  background: #f0f2f5;

  &.theme-dark {
    background: #141414;
  }

  .page-header {
    margin-bottom: 16px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        .page-title {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .page-subtitle {
          margin: 0;
          color: rgba(0, 0, 0, 0.45);
          font-size: 14px;
        }
      }
    }
  }

  .category-tabs-card {
    margin-bottom: 16px;

    .ant-radio-group {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .ant-radio-button-wrapper {
        flex: 0 0 auto;
        min-width: 80px;
        text-align: center;
        white-space: nowrap;
        padding: 0 12px;
      }
    }
  }

  .filter-card {
    margin-bottom: 16px;
  }

  .markets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;

    .market-card {
      cursor: pointer;
      transition: all 0.3s;
      border: 1px solid #e8e8e8;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &.high-opportunity {
        border-color: #52c41a;
        background: linear-gradient(135deg, #f6ffed 0%, #ffffff 100%);
      }

      &.medium-opportunity {
        border-color: #1890ff;
        background: linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%);
      }

      .market-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .market-volume {
          color: rgba(0, 0, 0, 0.65);
          font-size: 12px;
        }
      }

      .market-question {
        font-size: 16px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.85);
        margin-bottom: 16px;
        line-height: 1.5;
        min-height: 48px;
      }

      .market-probability {
        margin-bottom: 12px;

        .prob-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .prob-label {
            font-size: 12px;
            color: rgba(0, 0, 0, 0.45);
          }

          .prob-value {
            font-size: 20px;
            font-weight: 600;
            color: rgba(0, 0, 0, 0.85);
          }
        }
      }

      .market-ai-analysis {
        .ai-result {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .ai-item {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .ai-label {
              font-size: 12px;
              color: rgba(0, 0, 0, 0.45);
            }

            .ai-value {
              font-size: 14px;
              font-weight: 500;

              &.high-divergence {
                color: #52c41a;
                font-weight: 600;
              }

              &.medium-divergence {
                color: #1890ff;
              }
            }

            .ai-score {
              margin-left: 8px;
              font-size: 12px;
              color: rgba(0, 0, 0, 0.65);
            }
          }
        }
      }

      .market-footer {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
      }
    }
  }
}

.theme-dark {
  .polymarket-page {
    background: #141414;

    .market-card {
      background: #1f1f1f;
      border-color: #434343;

      .market-question {
        color: rgba(255, 255, 255, 0.85);
      }

      .market-ai-analysis .ai-result .ai-item .ai-label {
        color: rgba(255, 255, 255, 0.45);
      }
    }
  }
}
</style>
