<template>
  <div class="trading-bot" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title"><a-icon type="robot" class="title-icon" /> 交易机器人</h2>
      <p class="page-subtitle">Monitor, start, and stop your live trading bots</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-row">
      <div v-for="kpi in kpiCards" :key="kpi.label" class="kpi-card">
        <div class="kpi-icon" :style="{ color: kpi.color, background: kpi.color + '15' }">
          <a-icon :type="kpi.icon" />
        </div>
        <div class="kpi-body">
          <div class="kpi-label">{{ kpi.label }}</div>
          <div class="kpi-value">{{ kpi.value }}</div>
        </div>
      </div>
    </div>

    <!-- Main layout -->
    <a-row :gutter="20" class="main-layout">
      <!-- Left: Bot list -->
      <a-col :xs="24" :md="8" :lg="7">
        <a-card :bordered="false" class="list-card">
          <div slot="title" class="card-title-row">
            <span>Bots ({{ strategies.length }})</span>
            <a-button-group size="small">
              <a-button @click="$router.push({ path: '/strategy-live', query: { mode: 'create' } })">
                <a-icon type="line-chart" /> {{ $t('trading-bot.newIndicatorStrategy') }}
              </a-button>
              <a-button type="primary" @click="$router.push({ path: '/strategy-script', query: { mode: 'create' } })">
                <a-icon type="code" /> {{ $t('trading-bot.newScriptStrategy') }}
              </a-button>
            </a-button-group>
          </div>
          <a-spin :spinning="loading">
            <div v-if="strategies.length === 0 && !loading" class="empty-list">
              <a-empty description="No bots yet" />
              <p style="color: #8c8c8c; margin-top: 8px;">{{ $t('trading-bot.emptyHint') }}</p>
              <a-button-group style="margin-top: 12px;">
                <a-button type="primary" @click="$router.push({ path: '/strategy-live', query: { mode: 'create' } })">
                  <a-icon type="line-chart" /> {{ $t('trading-bot.newIndicatorStrategy') }}
                </a-button>
                <a-button @click="$router.push({ path: '/strategy-script', query: { mode: 'create' } })">
                  <a-icon type="code" /> {{ $t('trading-bot.newScriptStrategy') }}
                </a-button>
              </a-button-group>
            </div>
            <div v-else class="bot-items">
              <div
                v-for="item in strategies"
                :key="item.id"
                :class="['bot-item', { active: selectedBot && selectedBot.id === item.id }]"
                @click="handleSelectBot(item)"
              >
                <div class="bot-main">
                  <div class="bot-name">{{ item.strategy_name }}</div>
                  <div class="bot-meta">
                    <span class="bot-symbol" v-if="item.trading_config && item.trading_config.symbol">
                      {{ item.trading_config.symbol }}
                    </span>
                    <span class="bot-exchange" v-if="item.exchange_config && item.exchange_config.exchange_id">
                      {{ getExchangeDisplayName(item.exchange_config.exchange_id) }}
                    </span>
                  </div>
                </div>
                <div class="bot-status-col">
                  <span :class="['status-dot', item.status === 'running' ? 'running' : 'stopped']"></span>
                  <span class="status-text">{{ getStatusText(item.status) }}</span>
                </div>
              </div>
            </div>
          </a-spin>
        </a-card>
      </a-col>

      <!-- Right: Bot detail -->
      <a-col :xs="24" :md="16" :lg="17">
        <div v-if="!selectedBot" class="empty-detail">
          <div class="empty-detail-card">
            <a-icon type="robot" style="font-size: 48px; color: #d9d9d9;" />
            <h3>Select a bot</h3>
            <p>Choose a bot from the list to view details and manage</p>
          </div>
        </div>
        <div v-else class="detail-area">
          <!-- Bot header -->
          <a-card :bordered="false" class="detail-header-card">
            <div class="detail-header">
              <div class="header-info">
                <h3>{{ selectedBot.strategy_name }}</h3>
                <div class="header-tags">
                  <a-tag :color="selectedBot.status === 'running' ? 'green' : 'default'">
                    {{ getStatusText(selectedBot.status) }}
                  </a-tag>
                  <a-tag v-if="selectedBot.trading_config && selectedBot.trading_config.symbol" color="blue">
                    {{ selectedBot.trading_config.symbol }}
                  </a-tag>
                  <a-tag v-if="selectedBot.exchange_config && selectedBot.exchange_config.exchange_id">
                    {{ getExchangeDisplayName(selectedBot.exchange_config.exchange_id) }}
                  </a-tag>
                </div>
              </div>
              <div class="header-actions">
                <a-button
                  v-if="selectedBot.status !== 'running'"
                  type="primary"
                  :loading="actionLoading"
                  @click="handleStartBot(selectedBot)"
                >
                  <a-icon type="play-circle" /> Start
                </a-button>
                <a-button
                  v-else
                  type="danger"
                  :loading="actionLoading"
                  @click="handleStopBot(selectedBot)"
                >
                  <a-icon type="pause-circle" /> Stop
                </a-button>
                <a-button @click="goToStrategyScripts(selectedBot)">
                  <a-icon type="edit" /> Edit Code
                </a-button>
                <a-button type="danger" ghost @click="handleDeleteBot(selectedBot)">
                  <a-icon type="delete" />
                </a-button>
              </div>
            </div>
          </a-card>

          <!-- Detail tabs -->
          <a-card :bordered="false" class="detail-tabs-card" style="margin-top: 12px;">
            <a-tabs v-model="detailTab" :animated="false">
              <a-tab-pane key="positions" tab="Positions">
                <position-records
                  v-if="detailTab === 'positions'"
                  :strategyId="selectedBot.id"
                  :isDark="isDarkTheme"
                />
              </a-tab-pane>
              <a-tab-pane key="trades" tab="Trades">
                <trading-records
                  v-if="detailTab === 'trades'"
                  :strategyId="selectedBot.id"
                  :isDark="isDarkTheme"
                />
              </a-tab-pane>
              <a-tab-pane key="performance" tab="Performance">
                <performance-analysis
                  v-if="detailTab === 'performance'"
                  :strategyId="selectedBot.id"
                  :isDark="isDarkTheme"
                />
              </a-tab-pane>
              <a-tab-pane key="logs" tab="Logs">
                <strategy-logs
                  v-if="detailTab === 'logs'"
                  :strategyId="selectedBot.id"
                  :isDark="isDarkTheme"
                />
              </a-tab-pane>
            </a-tabs>
          </a-card>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { baseMixin } from '@/store/app-mixin'
import { getStrategyList, startStrategy, stopStrategy, deleteStrategy, getStrategyEquityCurve } from '@/api/strategy'
import { getUserInfo } from '@/api/login'
import TradingRecords from '@/views/trading-assistant/components/TradingRecords.vue'
import PositionRecords from '@/views/trading-assistant/components/PositionRecords.vue'
import PerformanceAnalysis from '@/views/trading-assistant/components/PerformanceAnalysis.vue'
import StrategyLogs from '@/views/trading-assistant/components/StrategyLogs.vue'

export default {
  name: 'TradingBot',
  mixins: [baseMixin],
  components: { TradingRecords, PositionRecords, PerformanceAnalysis, StrategyLogs },
  data () {
    return {
      userId: null,
      loading: false,
      strategies: [],
      selectedBot: null,
      detailTab: 'positions',
      actionLoading: false,
      equityCurve: []
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    kpiCards () {
      const strats = this.strategies || []
      const running = strats.filter(s => s.status === 'running').length
      const total = strats.length
      let totalEquity = 0
      let totalPnl = 0
      strats.forEach(s => {
        const tc = s.trading_config || {}
        totalEquity += tc.initial_capital || 0
        totalPnl += s.unrealized_pnl || 0
      })
      return [
        { label: 'Total Equity', value: '$' + totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 }), icon: 'wallet', color: '#1890ff' },
        { label: 'Total PnL', value: (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 }), icon: 'rise', color: totalPnl >= 0 ? '#52c41a' : '#f5222d' },
        { label: 'Running Bots', value: `${running} / ${total}`, icon: 'robot', color: '#722ed1' },
        { label: 'Stopped', value: String(total - running), icon: 'pause-circle', color: '#faad14' }
      ]
    }
  },
  async created () {
    try {
      const res = await getUserInfo()
      this.userId = res?.data?.id || res?.data?.user_id || 1
    } catch {
      this.userId = 1
    }
    this.loadStrategies()
    const q = this.$route.query
    if (q.strategy_id) {
      this.$nextTick(() => {
        const s = this.strategies.find(s => s.id === Number(q.strategy_id))
        if (s) this.selectedBot = s
      })
    }
  },
  methods: {
    async loadStrategies () {
      this.loading = true
      try {
        const res = await getStrategyList()
        this.strategies = Array.isArray(res?.data?.strategies) ? res.data.strategies : []
        if (this.selectedBot) {
          const updated = this.strategies.find(s => s.id === this.selectedBot.id)
          if (updated) this.selectedBot = updated
        }
        const q = this.$route.query
        if (q.strategy_id && !this.selectedBot) {
          const s = this.strategies.find(s => s.id === Number(q.strategy_id))
          if (s) this.selectedBot = s
        }
      } catch {
        this.strategies = []
      } finally {
        this.loading = false
      }
    },
    handleSelectBot (item) {
      this.selectedBot = item
      this.detailTab = 'positions'
      this.loadEquityCurve(item.id)
    },
    async handleStartBot (item) {
      this.actionLoading = true
      try {
        await startStrategy(item.id)
        this.$message.success('Bot started')
        this.loadStrategies()
      } catch (e) {
        this.$message.error(e.message || 'Failed to start')
      } finally {
        this.actionLoading = false
      }
    },
    async handleStopBot (item) {
      this.$confirm({
        title: 'Stop Bot',
        content: `Stop "${item.strategy_name}"?`,
        okType: 'danger',
        onOk: async () => {
          this.actionLoading = true
          try {
            await stopStrategy(item.id)
            this.$message.success('Bot stopped')
            this.loadStrategies()
          } catch (e) {
            this.$message.error(e.message || 'Failed')
          } finally {
            this.actionLoading = false
          }
        }
      })
    },
    handleDeleteBot (item) {
      if (item.status === 'running') {
        this.$message.warning('Stop the bot before deleting')
        return
      }
      this.$confirm({
        title: 'Delete Bot',
        content: `Delete "${item.strategy_name}"? This cannot be undone.`,
        okType: 'danger',
        onOk: async () => {
          await deleteStrategy(item.id)
          this.$message.success('Deleted')
          if (this.selectedBot?.id === item.id) this.selectedBot = null
          this.loadStrategies()
        }
      })
    },
    async loadEquityCurve (id) {
      try {
        const res = await getStrategyEquityCurve(id)
        this.equityCurve = res?.data?.curve || []
      } catch {
        this.equityCurve = []
      }
    },
    goToStrategyScripts (item) {
      const q = { strategy_id: String(item.id) }
      if (item.strategy_mode === 'script') {
        this.$router.push({ path: '/strategy-script', query: q })
      } else {
        this.$router.push({ path: '/strategy-live', query: q })
      }
    },
    getStatusText (s) {
      return { running: 'Running', stopped: 'Stopped', error: 'Error', creating: 'Creating' }[s] || s || 'Idle'
    },
    getExchangeDisplayName (id) {
      return { bybit: 'Bybit', gate: 'Gate.io', binance: 'Binance' }[id] || id || '-'
    }
  }
}
</script>

<style lang="less" scoped>
.trading-bot {
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: 16px;

  .page-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 2px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 10px;

    .title-icon {
      font-size: 24px;
      -webkit-text-fill-color: #1890ff;
    }
  }

  .page-subtitle {
    margin: 0;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.kpi-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.kpi-value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #262626;
}

.list-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }
}

.bot-items {
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}

.bot-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  margin-bottom: 6px;

  &:hover {
    background: #f5f7fa;
    border-color: #e8e8e8;
  }

  &.active {
    background: #e6f7ff;
    border-color: #91d5ff;
  }

  .bot-main {
    flex: 1;
    min-width: 0;
  }

  .bot-name {
    font-weight: 600;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bot-meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: #8c8c8c;
    margin-top: 2px;
  }
}

.bot-status-col {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.running {
    background: #52c41a;
    box-shadow: 0 0 6px rgba(82, 196, 26, 0.4);
    animation: pulse 2s infinite;
  }

  &.stopped {
    background: #d9d9d9;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 12px;
  color: #8c8c8c;
}

.empty-list {
  text-align: center;
  padding: 24px 0;
}

.empty-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;

  .empty-detail-card {
    text-align: center;
    color: #8c8c8c;
  }

  h3 {
    font-size: 18px;
    margin: 16px 0 8px;
    color: #333;
  }

  p {
    font-size: 14px;
  }
}

.detail-header-card,
.detail-tabs-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;

  .header-info {
    flex: 1;

    h3 {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 8px;
    }
  }

  .header-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

// Responsive: stack KPI cards on small screens
@media (max-width: 768px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
}

// Dark theme
.trading-bot.theme-dark {
  background: #141414;

  .page-header {
    .page-title {
      background: linear-gradient(135deg, #e0e6ed 0%, #c5ccd6 100%);
      -webkit-background-clip: text;
    }

    .page-subtitle {
      color: rgba(255, 255, 255, 0.45);
    }

    .title-icon {
      color: #40a9ff !important;
      -webkit-text-fill-color: #40a9ff;
    }
  }

  .kpi-card {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .kpi-value {
    color: rgba(255, 255, 255, 0.85);
  }

  .kpi-label {
    color: rgba(255, 255, 255, 0.45);
  }

  .list-card {
    background: #1f1f1f;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  .bot-item {
    &:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: #303030;
    }

    &.active {
      background: rgba(23, 125, 220, 0.12);
      border-color: rgba(23, 125, 220, 0.3);
    }

    .bot-name {
      color: rgba(255, 255, 255, 0.85);
    }

    .bot-meta {
      color: rgba(255, 255, 255, 0.45);
    }
  }

  .empty-detail {
    h3 {
      color: rgba(255, 255, 255, 0.85);
    }

    p {
      color: rgba(255, 255, 255, 0.45);
    }
  }

  .detail-header-card,
  .detail-tabs-card {
    background: #1f1f1f;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

    /deep/ .ant-card-body {
      background: #1f1f1f;
    }
  }

  .detail-header .header-info h3 {
    color: rgba(255, 255, 255, 0.85);
  }

  /deep/ .ant-tabs-bar {
    border-bottom-color: #303030;
  }

  /deep/ .ant-tabs-tab {
    color: rgba(255, 255, 255, 0.65);
  }

  /deep/ .ant-tabs-tab-active {
    color: #177ddc !important;
  }

  /deep/ .ant-tabs-ink-bar {
    background: #177ddc;
  }

  /deep/ .ant-card-head {
    border-bottom-color: #303030;
    background: transparent;
  }

  /deep/ .ant-card-head-title {
    color: rgba(255, 255, 255, 0.85);
  }
}
</style>
