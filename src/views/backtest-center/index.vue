<template>
  <div class="backtest-center" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="experiment" class="title-icon" />
        {{ $t('backtest-center.title') }}
      </h2>
      <p class="page-subtitle">{{ $t('backtest-center.subtitle') }}</p>
    </div>

    <a-tabs v-model="activeTab" class="main-tabs">
      <!-- ===== 指标回测 ===== -->
      <a-tab-pane key="indicator" :tab="$t('backtest-center.tabs.indicator')">
        <a-row :gutter="20" class="workspace">
          <!-- 左侧配置 -->
          <a-col :xs="24" :md="9" :lg="8" class="config-col">
            <div class="config-panel">
              <!-- 指标 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.indicator.selectIndicator') }}</div>
                <a-select
                  v-model="selectedIndicatorId"
                  :placeholder="$t('backtest-center.indicator.selectIndicatorPlaceholder')"
                  style="width: 100%"
                  :loading="loadingIndicators"
                  allow-clear
                  show-search
                  option-filter-prop="children"
                  @change="onIndicatorChange"
                >
                  <a-select-option
                    v-for="ind in indicators"
                    :key="ind.id"
                    :value="ind.id"
                  >{{ ind.name || ('Indicator #' + ind.id) }}</a-select-option>
                </a-select>
              </div>

              <!-- 交易标的（自选股） -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.symbol') }}</div>
                <a-select
                  v-model="selectedWatchlistKey"
                  :placeholder="$t('backtest-center.config.watchlistPlaceholder')"
                  style="width: 100%"
                  show-search
                  allow-clear
                  :filter-option="filterWatchlistOption"
                  @change="handleWatchlistChange"
                >
                  <a-select-option
                    v-for="w in watchlist"
                    :key="`${w.market}:${w.symbol}`"
                    :value="`${w.market}:${w.symbol}`"
                  >
                    <a-tag :color="getMarketColor(w.market)" size="small">{{ w.market }}</a-tag>
                    <strong style="margin-left: 4px;">{{ w.symbol }}</strong>
                    <span v-if="w.name" style="color: #999; margin-left: 4px; font-size: 12px;">{{ w.name }}</span>
                  </a-select-option>
                  <a-select-option key="__add__" value="__add__" class="add-option">
                    <div style="text-align: center; color: #1890ff;">
                      <a-icon type="plus" /> {{ $t('backtest-center.config.addSymbol') }}
                    </div>
                  </a-select-option>
                </a-select>
              </div>

              <!-- 时间周期 -->
              <div class="section">
                <div class="section-title">
                  {{ $t('backtest-center.config.timeframe') }}
                  <span class="hint">{{ tfLimitHint }}</span>
                </div>
                <a-radio-group
                  v-model="timeframe"
                  button-style="solid"
                  size="small"
                  class="tf-group"
                  @change="onTimeframeChange"
                >
                  <a-radio-button value="1m">1m</a-radio-button>
                  <a-radio-button value="5m">5m</a-radio-button>
                  <a-radio-button value="15m">15m</a-radio-button>
                  <a-radio-button value="1H">1H</a-radio-button>
                  <a-radio-button value="4H">4H</a-radio-button>
                  <a-radio-button value="1D">1D</a-radio-button>
                  <a-radio-button value="1W">1W</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 回测日期 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.dateRange') }}</div>
                <div class="date-presets">
                  <a-button
                    v-for="p in filteredDatePresets"
                    :key="p.key"
                    size="small"
                    :type="datePreset === p.key ? 'primary' : 'default'"
                    @click="applyDatePreset(p)"
                  >{{ p.label }}</a-button>
                </div>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <a-date-picker
                      v-model="startDate"
                      :placeholder="$t('backtest-center.config.startDate')"
                      style="width: 100%"
                      size="small"
                    />
                  </a-col>
                  <a-col :span="12">
                    <a-date-picker
                      v-model="endDate"
                      :placeholder="$t('backtest-center.config.endDate')"
                      style="width: 100%"
                      size="small"
                    />
                  </a-col>
                </a-row>
              </div>

              <!-- 资金设置 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.capital') }}</div>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.initialCapital') }}</div>
                    <a-input-number
                      v-model="initialCapital"
                      :min="1000"
                      :step="10000"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                      :parser="v => v.replace(/\$\s?|(,*)/g, '')"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.leverage') }}</div>
                    <a-input-number
                      v-model="leverage"
                      :min="1"
                      :max="125"
                      :step="1"
                      :precision="0"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `${v}x`"
                      :parser="v => v.replace('x', '')"
                    />
                  </a-col>
                </a-row>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.commission') }} (%)</div>
                    <a-input-number
                      v-model="commission"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.slippage') }} (%)</div>
                    <a-input-number
                      v-model="slippage"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                </a-row>
              </div>

              <!-- 交易方向 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.direction') }}</div>
                <a-radio-group
                  v-model="tradeDirection"
                  size="small"
                  button-style="solid"
                >
                  <a-radio-button value="long">{{ $t('backtest-center.config.long') }}</a-radio-button>
                  <a-radio-button value="short">{{ $t('backtest-center.config.short') }}</a-radio-button>
                  <a-radio-button value="both">{{ $t('backtest-center.config.both') }}</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 风控参数（直接展示） -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.riskPanel') }}</div>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.stopLoss') }} (%)</div>
                    <a-input-number
                      v-model="stopLossPct"
                      :min="0"
                      :max="100"
                      :step="0.5"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.takeProfit') }} (%)</div>
                    <a-input-number
                      v-model="takeProfitPct"
                      :min="0"
                      :max="1000"
                      :step="0.5"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                </a-row>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.entryPct') }} (%)</div>
                    <a-input-number
                      v-model="entryPct"
                      :min="0"
                      :max="100"
                      :step="5"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <a-checkbox
                      v-model="trailingEnabled"
                      style="margin-top: 18px;"
                    >{{ $t('backtest-center.config.trailing') }}</a-checkbox>
                  </a-col>
                </a-row>
                <template v-if="trailingEnabled">
                  <a-row :gutter="8" style="margin-top: 8px;">
                    <a-col :span="12">
                      <div class="field-label">{{ $t('backtest-center.config.trailingPct') }} (%)</div>
                      <a-input-number
                        v-model="trailingStopPct"
                        :min="0"
                        :max="100"
                        :step="0.5"
                        :precision="2"
                        size="small"
                        style="width: 100%"
                      />
                    </a-col>
                    <a-col :span="12">
                      <div class="field-label">{{ $t('backtest-center.config.trailingActivation') }} (%)</div>
                      <a-input-number
                        v-model="trailingActivationPct"
                        :min="0"
                        :max="1000"
                        :step="0.5"
                        :precision="2"
                        size="small"
                        style="width: 100%"
                      />
                    </a-col>
                  </a-row>
                </template>
              </div>

              <!-- 运行按钮 -->
              <div class="run-section">
                <a-button
                  type="primary"
                  block
                  size="large"
                  :loading="running"
                  :disabled="!canRunIndicator"
                  @click="runIndicatorBacktest"
                >
                  <a-icon v-if="!running" type="thunderbolt" />
                  {{ running ? $t('backtest-center.running') : $t('backtest-center.indicator.runBacktest') }}
                </a-button>
                <a-button
                  block
                  style="margin-top: 8px;"
                  :disabled="!selectedIndicatorId"
                  @click="openHistory('indicator')"
                >
                  <a-icon type="history" />
                  {{ $t('backtest-center.indicator.history') }}
                </a-button>
              </div>
            </div>
          </a-col>

          <!-- 右侧结果 -->
          <a-col :xs="24" :md="15" :lg="16" class="result-col">
            <div class="result-panel">
              <result-view
                :running="running"
                :run-tip="runTip"
                :has-result="hasResult"
                :result="result"
                :backtestRunId="backtestRunId"
                :symbol="symbol"
                :market="market"
                :timeframe="timeframe"
                :is-dark="isDarkTheme"
              />
            </div>
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- ===== 策略回测 ===== -->
      <a-tab-pane key="strategy" :tab="$t('backtest-center.tabs.strategy')">
        <a-row :gutter="20" class="workspace">
          <a-col :xs="24" :md="9" :lg="8" class="config-col">
            <div class="config-panel">
              <!-- 策略选择 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.strategy.selectStrategy') }}</div>
                <a-select
                  v-model="selectedStrategyId"
                  :placeholder="$t('backtest-center.strategy.selectStrategyPlaceholder')"
                  style="width: 100%"
                  :loading="loadingStrategies"
                  allow-clear
                  show-search
                  option-filter-prop="children"
                  @change="onStrategyChange"
                >
                  <a-select-option
                    v-for="s in strategies"
                    :key="s.id"
                    :value="s.id"
                  >{{ s.strategy_name || ('Strategy #' + s.id) }}</a-select-option>
                </a-select>
                <div v-if="selectedStrategyObj" class="strategy-info">
                  <span v-if="selectedStrategyObj.symbol">
                    <a-tag size="small">{{ selectedStrategyObj.symbol }}</a-tag>
                  </span>
                  <span v-if="selectedStrategyObj.strategy_mode === 'script'" style="color: #9254de; font-size: 11px;">[Script]</span>
                </div>
              </div>

              <!-- 标的覆盖 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.symbol') }}</div>
                <a-select
                  v-model="stSelectedWatchlistKey"
                  :placeholder="$t('backtest-center.config.watchlistPlaceholder')"
                  style="width: 100%"
                  show-search
                  allow-clear
                  :filter-option="filterWatchlistOption"
                  @change="handleStWatchlistChange"
                >
                  <a-select-option
                    v-for="w in watchlist"
                    :key="`${w.market}:${w.symbol}`"
                    :value="`${w.market}:${w.symbol}`"
                  >
                    <a-tag :color="getMarketColor(w.market)" size="small">{{ w.market }}</a-tag>
                    <strong style="margin-left: 4px;">{{ w.symbol }}</strong>
                    <span v-if="w.name" style="color: #999; margin-left: 4px; font-size: 12px;">{{ w.name }}</span>
                  </a-select-option>
                  <a-select-option key="__add__" value="__add__" class="add-option">
                    <div style="text-align: center; color: #1890ff;">
                      <a-icon type="plus" /> {{ $t('backtest-center.config.addSymbol') }}
                    </div>
                  </a-select-option>
                </a-select>
              </div>

              <!-- 时间周期 -->
              <div class="section">
                <div class="section-title">
                  {{ $t('backtest-center.config.timeframe') }}
                  <span class="hint">{{ stTfLimitHint }}</span>
                </div>
                <a-radio-group
                  v-model="stTimeframe"
                  button-style="solid"
                  size="small"
                  class="tf-group"
                  @change="onStTimeframeChange"
                >
                  <a-radio-button value="1m">1m</a-radio-button>
                  <a-radio-button value="5m">5m</a-radio-button>
                  <a-radio-button value="15m">15m</a-radio-button>
                  <a-radio-button value="1H">1H</a-radio-button>
                  <a-radio-button value="4H">4H</a-radio-button>
                  <a-radio-button value="1D">1D</a-radio-button>
                  <a-radio-button value="1W">1W</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 日期 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.dateRange') }}</div>
                <div class="date-presets">
                  <a-button
                    v-for="p in stFilteredDatePresets"
                    :key="'st-' + p.key"
                    size="small"
                    :type="stDatePreset === p.key ? 'primary' : 'default'"
                    @click="applyStDatePreset(p)"
                  >{{ p.label }}</a-button>
                </div>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <a-date-picker v-model="stStartDate" :placeholder="$t('backtest-center.config.startDate')" style="width: 100%" size="small" />
                  </a-col>
                  <a-col :span="12">
                    <a-date-picker v-model="stEndDate" :placeholder="$t('backtest-center.config.endDate')" style="width: 100%" size="small" />
                  </a-col>
                </a-row>
              </div>

              <!-- 资金 -->
              <div class="section">
                <div class="section-title">{{ $t('backtest-center.config.capital') }}</div>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.initialCapital') }}</div>
                    <a-input-number
                      v-model="stInitialCapital"
                      :min="1000"
                      :step="10000"
                      :precision="2"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                      :parser="v => v.replace(/\$\s?|(,*)/g, '')"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.leverage') }}</div>
                    <a-input-number
                      v-model="stLeverage"
                      :min="1"
                      :max="125"
                      :step="1"
                      :precision="0"
                      size="small"
                      style="width: 100%"
                      :formatter="v => `${v}x`"
                      :parser="v => v.replace('x', '')"
                    />
                  </a-col>
                </a-row>
                <a-row :gutter="8" style="margin-top: 8px;">
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.commission') }} (%)</div>
                    <a-input-number
                      v-model="stCommission"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                  <a-col :span="12">
                    <div class="field-label">{{ $t('backtest-center.config.slippage') }} (%)</div>
                    <a-input-number
                      v-model="stSlippage"
                      :min="0"
                      :max="10"
                      :step="0.01"
                      :precision="4"
                      size="small"
                      style="width: 100%"
                    />
                  </a-col>
                </a-row>
              </div>

              <!-- 运行 -->
              <div class="run-section">
                <a-button
                  type="primary"
                  block
                  size="large"
                  :loading="stRunning"
                  :disabled="!canRunStrategy"
                  @click="runStrategyBacktest"
                >
                  <a-icon v-if="!stRunning" type="thunderbolt" />
                  {{ stRunning ? $t('backtest-center.running') : $t('backtest-center.strategy.runBacktest') }}
                </a-button>
                <a-button
                  block
                  style="margin-top: 8px;"
                  :disabled="!selectedStrategyId"
                  @click="openHistory('strategy')"
                >
                  <a-icon type="history" />
                  {{ $t('backtest-center.indicator.history') }}
                </a-button>
              </div>
            </div>
          </a-col>

          <!-- 策略右侧结果 -->
          <a-col :xs="24" :md="15" :lg="16" class="result-col">
            <div class="result-panel">
              <result-view
                :running="stRunning"
                :run-tip="stRunTip"
                :has-result="stHasResult"
                :result="stResult"
                :backtestRunId="stBacktestRunId"
                :symbol="stSymbol"
                :market="stMarket"
                :timeframe="stTimeframe"
                :is-dark="isDarkTheme"
              />
            </div>
          </a-col>
        </a-row>
      </a-tab-pane>
    </a-tabs>

    <!-- 添加自选股弹窗 -->
    <a-modal
      :title="$t('dashboard.analysis.modal.addStock.title')"
      :visible="showAddModal"
      @ok="handleAddStock"
      @cancel="showAddModal = false"
      :confirmLoading="addingStock"
      width="560px"
    >
      <a-tabs v-model="addMarketTab" size="small" @change="onAddMarketTabChange">
        <a-tab-pane key="Crypto" tab="Crypto" />
        <a-tab-pane key="USStock" tab="US Stock" />
        <a-tab-pane key="HKStock" tab="HK Stock" />
        <a-tab-pane key="Forex" tab="Forex" />
        <a-tab-pane key="Futures" tab="Futures" />
      </a-tabs>
      <a-input-search
        v-model="addSearchKeyword"
        :placeholder="$t('backtest-center.config.symbolPlaceholder')"
        @search="doAddSearch"
        @change="onAddSearchInput"
        :loading="addSearching"
        size="large"
        allow-clear
        style="margin: 12px 0;"
      />
      <a-list
        v-if="addSearchResults.length > 0"
        size="small"
        :data-source="addSearchResults"
        style="max-height: 240px; overflow-y: auto;"
      >
        <a-list-item
          slot="renderItem"
          slot-scope="item"
          style="cursor: pointer;"
          :class="{ 'add-item-active': addSelectedItem && addSelectedItem.symbol === item.symbol }"
          @click="addSelectedItem = item"
        >
          <strong>{{ item.symbol }}</strong>
          <span v-if="item.name" style="color: #999; margin-left: 8px;">{{ item.name }}</span>
          <a-icon v-if="addSelectedItem && addSelectedItem.symbol === item.symbol" type="check-circle" theme="filled" style="color: #52c41a; margin-left: auto;" />
        </a-list-item>
      </a-list>
      <div v-if="addSearchResults.length === 0 && addSearchKeyword && addSearched" style="padding: 16px 0; text-align: center; color: #999;">
        {{ $t('backtest-center.config.noSearchResult') }}
      </div>
    </a-modal>

    <!-- 回测历史 -->
    <backtest-history-drawer
      :visible="showHistoryDrawer"
      :userId="userId"
      :indicatorId="historyIndicatorId"
      :isMobile="false"
      @cancel="showHistoryDrawer = false"
      @view="handleViewRun"
    />
    <backtest-run-viewer
      :visible="showRunViewer"
      :run="selectedRun"
      @cancel="showRunViewer = false; selectedRun = null"
    />
  </div>
</template>

<script>
import moment from 'moment'
import * as echarts from 'echarts'
import { baseMixin } from '@/store/app-mixin'
import request from '@/utils/request'
import { getStrategyList } from '@/api/strategy'
import { getUserInfo } from '@/api/login'
import { getWatchlist, addWatchlist, searchSymbols } from '@/api/market'
import BacktestHistoryDrawer from '@/views/indicator-analysis/components/BacktestHistoryDrawer.vue'
import BacktestRunViewer from '@/views/indicator-analysis/components/BacktestRunViewer.vue'

const TF_MAX_DAYS = {
  '1m': 30,
  '5m': 180,
  '15m': 365,
  '30m': 365,
  '1H': 730,
  '4H': 1460,
  '1D': 3650,
  '1W': 7300
}

const DATE_PRESETS = [
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: '2y', label: '2Y', days: 730 },
  { key: '5y', label: '5Y', days: 1825 }
]

const ResultView = {
  name: 'ResultView',
  props: {
    running: Boolean,
    runTip: String,
    hasResult: Boolean,
    result: Object,
    backtestRunId: [Number, String],
    symbol: String,
    market: String,
    timeframe: String,
    isDark: Boolean
  },
  data () {
    return { chartInstance: null }
  },
  computed: {
    pairedTrades () {
      const raw = (this.result && this.result.trades) || []
      const pairs = []
      let openTrade = null
      let idx = 1
      for (const t of raw) {
        const ty = (t.type || '').toLowerCase()
        if (ty.startsWith('open_') || ty === 'buy') {
          openTrade = t
        } else if (openTrade) {
          pairs.push({
            id: idx++,
            type: openTrade.type.includes('long') || openTrade.type === 'buy' ? 'long' : 'short',
            entryDate: openTrade.time || '',
            exitDate: t.time || '',
            entryPrice: openTrade.price,
            exitPrice: t.price,
            amount: openTrade.amount || t.amount || 0,
            profit: t.profit || 0,
            balance: t.balance || 0
          })
          openTrade = null
        }
      }
      return pairs
    },
    tradeColumns () {
      return [
        { title: '#', dataIndex: 'id', width: 50 },
        { title: this.$t('backtest-center.result.colType'), dataIndex: 'type', scopedSlots: { customRender: 'type' }, width: 80 },
        { title: this.$t('backtest-center.result.colEntry'), dataIndex: 'entryDate', width: 140 },
        { title: this.$t('backtest-center.result.colExit'), dataIndex: 'exitDate', width: 140 },
        { title: this.$t('backtest-center.result.colEntryPrice'), dataIndex: 'entryPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('backtest-center.result.colExitPrice'), dataIndex: 'exitPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('backtest-center.result.colProfit'), dataIndex: 'profit', scopedSlots: { customRender: 'profit' }, width: 120 }
      ]
    }
  },
  watch: {
    hasResult (val) {
      if (val) this.$nextTick(() => this.renderChart())
    },
    isDark () {
      if (this.hasResult) this.$nextTick(() => this.renderChart())
    }
  },
  beforeDestroy () {
    if (this.chartInstance) this.chartInstance.dispose()
  },
  methods: {
    fmtPct (v) {
      if (v == null || isNaN(v)) return '--'
      const sign = v >= 0 ? '+' : ''
      return sign + Number(v).toFixed(2) + '%'
    },
    fmtMoney (v) {
      if (v == null || isNaN(v)) return '$0.00'
      const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return (v >= 0 ? '' : '-') + '$' + abs
    },
    fmtPrice (v) {
      if (v == null || isNaN(v)) return '--'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    },
    renderChart () {
      const r = this.result
      if (!r || !r.equityCurve || !r.equityCurve.length) return
      const dom = this.$refs.eqChart
      if (!dom) return
      if (this.chartInstance) this.chartInstance.dispose()
      this.chartInstance = echarts.init(dom)
      const dk = this.isDark
      const data = r.equityCurve
      const isPositive = data.length > 1 && (data[data.length - 1].value || 0) >= (data[0].value || 0)
      const lineColor = isPositive ? '#52c41a' : '#f5222d'
      this.chartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.85)' : '#333', fontSize: 12 },
          formatter: (params) => {
            const p = params[0]
            return `<div style="font-size:11px;color:${dk ? 'rgba(255,255,255,0.5)' : '#999'}">${p.name}</div><div style="font-size:13px;font-weight:600;color:${dk ? 'rgba(255,255,255,0.85)' : '#333'}">$${Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>`
          }
        },
        grid: { left: 65, right: 20, top: 20, bottom: 30 },
        xAxis: {
          type: 'category',
          data: data.map(d => d.time || ''),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.35)' : '#999', fontSize: 10, rotate: 0, interval: Math.floor(data.length / 6) },
          axisLine: { lineStyle: { color: dk ? '#303030' : '#e0e0e0' } },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: dk ? 'rgba(255,255,255,0.35)' : '#999', fontSize: 11, formatter: v => '$' + (v / 1000).toFixed(1) + 'k' },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        series: [{
          type: 'line',
          data: data.map(d => d.value || 0),
          smooth: 0.3,
          showSymbol: false,
          lineStyle: { width: 2, color: lineColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isPositive ? 'rgba(82,196,26,0.2)' : 'rgba(245,34,45,0.2)' },
              { offset: 1, color: 'rgba(0,0,0,0)' }
            ])
          }
        }]
      })
      window.addEventListener('resize', () => { if (this.chartInstance) this.chartInstance.resize() })
    }
  },
  render (h) {
    const dk = this.isDark

    if (this.running) {
      return h('div', { class: 'running-overlay' }, [
        h('div', { class: 'running-content' }, [
          h('div', { class: 'loading-pulse' }, [
            h('div', { class: 'pulse-ring' }),
            h('div', { class: 'pulse-icon' }, [h('a-icon', { props: { type: 'line-chart', style: 'font-size: 28px' } })])
          ]),
          h('div', { class: 'running-text' }, this.$t('backtest-center.running')),
          h('div', { class: 'running-sub' }, this.runTip || '...'),
          h('div', { class: 'running-dots' }, [
            h('span', { class: 'dot dot1' }),
            h('span', { class: 'dot dot2' }),
            h('span', { class: 'dot dot3' })
          ])
        ])
      ])
    }

    if (!this.hasResult) {
      return h('div', { class: 'empty-result' }, [
        h('div', { class: 'empty-icon' }, [h('a-icon', { props: { type: 'bar-chart' } })]),
        h('h3', this.$t('backtest-center.emptyTitle')),
        h('p', this.$t('backtest-center.emptyDesc'))
      ])
    }

    const r = this.result || {}
    const metricCards = [
      { label: 'totalReturn', value: this.fmtPct(r.totalReturn), cls: (r.totalReturn || 0) >= 0 ? 'positive' : 'negative', sub: this.fmtMoney(r.totalProfit) },
      { label: 'annualReturn', value: this.fmtPct(r.annualReturn), cls: (r.annualReturn || 0) >= 0 ? 'positive' : 'negative' },
      { label: 'maxDrawdown', value: this.fmtPct(r.maxDrawdown), cls: 'negative' },
      { label: 'sharpe', value: (r.sharpeRatio || 0).toFixed(2), cls: (r.sharpeRatio || 0) >= 1 ? 'positive' : (r.sharpeRatio || 0) < 0 ? 'negative' : '' },
      { label: 'winRate', value: this.fmtPct(r.winRate), cls: (r.winRate || 0) >= 50 ? 'positive' : '' },
      { label: 'profitFactor', value: (r.profitFactor || 0).toFixed(2), cls: (r.profitFactor || 0) >= 1.5 ? 'positive' : (r.profitFactor || 0) < 1 ? 'negative' : '' },
      { label: 'trades', value: String(r.totalTrades || 0), cls: '' },
      { label: 'commission', value: this.fmtMoney(-(r.totalCommission || 0)), cls: '' }
    ]

    return h('div', { class: 'result-content' }, [
      h('div', { class: 'result-header' }, [
        h('span', { class: 'result-tag' }, [
          h('a-tag', { props: { color: 'blue' } }, this.symbol),
          h('a-tag', {}, this.market),
          h('a-tag', {}, this.timeframe)
        ]),
        this.backtestRunId ? h('span', { class: 'run-id' }, 'Run #' + this.backtestRunId) : null
      ]),

      h('div', { class: 'metrics-cards' }, metricCards.map(m =>
        h('div', { class: ['metric-card', m.cls] }, [
          h('div', { class: 'metric-label' }, this.$t('backtest-center.result.' + m.label)),
          h('div', { class: 'metric-value' }, m.value),
          m.sub ? h('div', { class: 'metric-sub' }, m.sub) : null
        ])
      )),

      h('div', { class: 'chart-section' }, [
        h('div', { class: 'chart-title' }, [
          h('a-icon', { props: { type: 'area-chart' }, style: 'margin-right: 6px' }),
          this.$t('backtest-center.result.equityCurve')
        ]),
        h('div', { ref: 'eqChart', class: 'equity-chart' })
      ]),

      h('div', { class: 'trades-section' }, [
        h('div', { class: 'chart-title' }, [
          h('a-icon', { props: { type: 'swap' }, style: 'margin-right: 6px' }),
          this.$t('backtest-center.result.tradeHistory'),
          h('span', { style: 'font-weight:400;font-size:12px;margin-left:8px;color:#999' }, `(${this.pairedTrades.length})`)
        ]),
        h('a-table', {
          props: {
            columns: this.tradeColumns,
            dataSource: this.pairedTrades,
            pagination: { pageSize: 10, size: 'small', showTotal: (t) => `${t} trades` },
            size: 'small',
            scroll: { x: 750 },
            rowKey: 'id'
          },
          scopedSlots: {
            type: (text) => h('a-tag', { props: { color: text === 'long' ? 'green' : 'red' }, style: 'margin:0' }, text === 'long' ? 'LONG' : 'SHORT'),
            price: (text) => h('span', { style: 'font-variant-numeric: tabular-nums' }, this.fmtPrice(text)),
            profit: (text) => h('span', {
              style: {
                color: text > 0 ? '#52c41a' : text < 0 ? '#f5222d' : (dk ? 'rgba(255,255,255,0.65)' : '#666'),
                fontWeight: '600',
                fontVariantNumeric: 'tabular-nums'
              }
            }, this.fmtMoney(text))
          }
        })
      ])
    ])
  }
}

export default {
  name: 'BacktestCenter',
  mixins: [baseMixin],
  components: { BacktestHistoryDrawer, BacktestRunViewer, ResultView },
  data () {
    return {
      activeTab: 'indicator',
      userId: null,
      watchlist: [],
      loadingWatchlist: false,
      // add symbol modal
      showAddModal: false,
      addingStock: false,
      addMarketTab: 'Crypto',
      addSearchKeyword: '',
      addSearchResults: [],
      addSearching: false,
      addSelectedItem: null,
      addSearched: false,
      addSearchTimer: null,
      addTriggerSource: '', // 'indicator' or 'strategy'
      // indicators
      indicators: [],
      loadingIndicators: false,
      selectedIndicatorId: undefined,
      // indicator backtest config
      selectedWatchlistKey: undefined,
      market: 'Crypto',
      symbol: '',
      timeframe: '1D',
      startDate: moment().subtract(6, 'months'),
      endDate: moment(),
      datePreset: '6m',
      initialCapital: 10000,
      leverage: 1,
      commission: 0.02,
      slippage: 0,
      tradeDirection: 'long',
      stopLossPct: 0,
      takeProfitPct: 0,
      entryPct: 100,
      trailingEnabled: false,
      trailingStopPct: 0,
      trailingActivationPct: 0,
      // indicator run state
      running: false,
      runTip: '',
      runTimer: null,
      hasResult: false,
      backtestRunId: null,
      result: {},
      // strategies
      strategies: [],
      loadingStrategies: false,
      selectedStrategyId: undefined,
      // strategy backtest config
      stSelectedWatchlistKey: undefined,
      stMarket: 'Crypto',
      stSymbol: '',
      stTimeframe: '1D',
      stStartDate: moment().subtract(6, 'months'),
      stEndDate: moment(),
      stDatePreset: '6m',
      stInitialCapital: 10000,
      stLeverage: 1,
      stCommission: 0.02,
      stSlippage: 0,
      // strategy run state
      stRunning: false,
      stRunTip: '',
      stRunTimer: null,
      stHasResult: false,
      stBacktestRunId: null,
      stResult: {},
      // history
      showHistoryDrawer: false,
      historyIndicatorId: null,
      showRunViewer: false,
      selectedRun: null
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    selectedIndicatorObj () {
      return this.selectedIndicatorId ? this.indicators.find(i => i.id === this.selectedIndicatorId) : null
    },
    selectedStrategyObj () {
      return this.selectedStrategyId ? this.strategies.find(s => s.id === this.selectedStrategyId) : null
    },
    canRunIndicator () {
      return this.selectedIndicatorId && this.symbol && this.startDate && this.endDate
    },
    canRunStrategy () {
      return this.selectedStrategyId && this.stSymbol && this.stStartDate && this.stEndDate
    },
    tfMaxDays () { return TF_MAX_DAYS[this.timeframe] || 3650 },
    stTfMaxDays () { return TF_MAX_DAYS[this.stTimeframe] || 3650 },
    tfLimitHint () {
      const d = this.tfMaxDays
      if (d <= 30) return `(≤ 1${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 180) return `(≤ 6${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 365) return `(≤ 1${this.$t('backtest-center.config.yearUnit')})`
      if (d <= 730) return `(≤ 2${this.$t('backtest-center.config.yearUnit')})`
      return `(≤ ${Math.round(d / 365)}${this.$t('backtest-center.config.yearUnit')})`
    },
    stTfLimitHint () {
      const d = this.stTfMaxDays
      if (d <= 30) return `(≤ 1${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 180) return `(≤ 6${this.$t('backtest-center.config.monthUnit')})`
      if (d <= 365) return `(≤ 1${this.$t('backtest-center.config.yearUnit')})`
      if (d <= 730) return `(≤ 2${this.$t('backtest-center.config.yearUnit')})`
      return `(≤ ${Math.round(d / 365)}${this.$t('backtest-center.config.yearUnit')})`
    },
    filteredDatePresets () {
      return DATE_PRESETS.filter(p => p.days <= this.tfMaxDays)
    },
    stFilteredDatePresets () {
      return DATE_PRESETS.filter(p => p.days <= this.stTfMaxDays)
    }
  },
  async created () {
    await this.loadUserId()
    this.loadIndicators()
    this.loadStrategies()
    this.loadWatchlistData()
    this.parseQuery()
  },
  beforeDestroy () {
    clearInterval(this.runTimer)
    clearInterval(this.stRunTimer)
    clearTimeout(this.addSearchTimer)
  },
  methods: {
    // ===== Data loading =====
    async loadUserId () {
      try {
        const res = await getUserInfo()
        if (res && res.data) this.userId = res.data.id || res.data.user_id || 1
      } catch { this.userId = 1 }
    },
    async loadIndicators () {
      if (!this.userId) return
      this.loadingIndicators = true
      try {
        const res = await request({ url: '/api/indicator/getIndicators', method: 'get', params: { userid: this.userId } })
        if (res && res.data && Array.isArray(res.data)) {
          this.indicators = res.data.map(item => ({ ...item, type: 'python' }))
        }
      } catch (e) { console.warn('Load indicators failed:', e) } finally { this.loadingIndicators = false }
    },
    async loadStrategies () {
      this.loadingStrategies = true
      try {
        const res = await getStrategyList()
        if (res && res.data && Array.isArray(res.data)) this.strategies = res.data
      } catch (e) { console.warn('Load strategies failed:', e) } finally { this.loadingStrategies = false }
    },
    async loadWatchlistData () {
      if (!this.userId) return
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) this.watchlist = res.data
      } catch { /* silent */ } finally { this.loadingWatchlist = false }
    },
    parseQuery () {
      const q = this.$route.query
      if (q.tab === 'strategy') this.activeTab = 'strategy'
      if (q.indicator_id) this.selectedIndicatorId = Number(q.indicator_id) || undefined
      if (q.strategy_id) this.selectedStrategyId = Number(q.strategy_id) || undefined
      if (q.view === 'history') this.$nextTick(() => this.openHistory(this.activeTab))
    },

    // ===== Watchlist symbol selection =====
    filterWatchlistOption (input, option) {
      const val = (option.componentOptions.propsData.value || '').toLowerCase()
      if (val === '__add__') return true
      return val.includes(input.toLowerCase())
    },
    handleWatchlistChange (val) {
      if (val === '__add__') {
        this.addTriggerSource = 'indicator'
        this.showAddModal = true
        this.$nextTick(() => { this.selectedWatchlistKey = undefined })
        return
      }
      if (val) {
        const [m, s] = val.split(':')
        this.market = m
        this.symbol = s
      } else {
        this.market = ''
        this.symbol = ''
      }
    },
    handleStWatchlistChange (val) {
      if (val === '__add__') {
        this.addTriggerSource = 'strategy'
        this.showAddModal = true
        this.$nextTick(() => { this.stSelectedWatchlistKey = undefined })
        return
      }
      if (val) {
        const [m, s] = val.split(':')
        this.stMarket = m
        this.stSymbol = s
      } else {
        this.stMarket = ''
        this.stSymbol = ''
      }
    },
    getMarketColor (m) {
      const colors = { Crypto: 'orange', USStock: 'blue', HKStock: 'red', Forex: 'green', Futures: 'purple', PredictionMarket: 'cyan' }
      return colors[m] || 'default'
    },

    // ===== Add symbol modal =====
    onAddMarketTabChange () {
      this.addSearchKeyword = ''
      this.addSearchResults = []
      this.addSelectedItem = null
      this.addSearched = false
    },
    onAddSearchInput () {
      clearTimeout(this.addSearchTimer)
      if (!this.addSearchKeyword) { this.addSearchResults = []; return }
      this.addSearchTimer = setTimeout(() => this.doAddSearch(), 400)
    },
    async doAddSearch () {
      if (!this.addSearchKeyword) return
      this.addSearching = true
      try {
        const res = await searchSymbols({ market: this.addMarketTab, keyword: this.addSearchKeyword, limit: 20 })
        if (res && res.data && Array.isArray(res.data)) {
          this.addSearchResults = res.data
        } else {
          this.addSearchResults = []
        }
        this.addSearched = true
        if (this.addSearchResults.length === 0) {
          this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
        }
      } catch {
        this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
      } finally { this.addSearching = false }
    },
    async handleAddStock () {
      const item = this.addSelectedItem
      if (!item || !item.symbol) {
        this.$message.warning(this.$t('backtest-center.config.symbolRequired'))
        return
      }
      this.addingStock = true
      try {
        const mkt = item.market || this.addMarketTab
        await addWatchlist({ userid: this.userId, market: mkt, symbol: item.symbol, name: item.name || '' })
        this.$message.success(this.$t('backtest-center.config.addSuccess'))
        await this.loadWatchlistData()
        const key = `${mkt}:${item.symbol}`
        if (this.addTriggerSource === 'strategy') {
          this.stSelectedWatchlistKey = key
          this.stMarket = mkt
          this.stSymbol = item.symbol
        } else {
          this.selectedWatchlistKey = key
          this.market = mkt
          this.symbol = item.symbol
        }
        this.showAddModal = false
      } catch (e) {
        this.$message.error(e.message || 'Failed')
      } finally { this.addingStock = false }
    },

    // ===== Timeframe / date range =====
    onTimeframeChange () {
      this.clampDateRange('indicator')
      this.datePreset = this.matchPreset(this.startDate, this.endDate)
    },
    onStTimeframeChange () {
      this.clampDateRange('strategy')
      this.stDatePreset = this.matchPreset(this.stStartDate, this.stEndDate)
    },
    clampDateRange (tab) {
      const max = tab === 'strategy' ? this.stTfMaxDays : this.tfMaxDays
      const start = tab === 'strategy' ? this.stStartDate : this.startDate
      const end = tab === 'strategy' ? this.stEndDate : this.endDate
      if (!start || !end) return
      const diff = end.diff(start, 'days')
      if (diff > max) {
        const newStart = moment(end).subtract(max, 'days')
        if (tab === 'strategy') this.stStartDate = newStart
        else this.startDate = newStart
      }
    },
    matchPreset (start, end) {
      if (!start || !end) return ''
      const days = end.diff(start, 'days')
      for (const p of DATE_PRESETS) {
        if (Math.abs(days - p.days) < 5) return p.key
      }
      return ''
    },
    applyDatePreset (p) {
      this.datePreset = p.key
      this.startDate = moment().subtract(p.days, 'days')
      this.endDate = moment()
    },
    applyStDatePreset (p) {
      this.stDatePreset = p.key
      this.stStartDate = moment().subtract(p.days, 'days')
      this.stEndDate = moment()
    },
    onIndicatorChange () { this.hasResult = false },
    onStrategyChange () {
      this.stHasResult = false
      const s = this.selectedStrategyObj
      if (s && s.symbol) {
        const mkt = s.market_category || s.market_type || 'Crypto'
        const sym = s.symbol
        this.stSelectedWatchlistKey = `${mkt}:${sym}`
        this.stMarket = mkt
        this.stSymbol = sym
      }
    },

    // ===== Run indicator backtest =====
    async runIndicatorBacktest () {
      if (!this.canRunIndicator) return
      this.running = true
      this.hasResult = false
      this.runTip = ''
      let sec = 0
      this.runTimer = setInterval(() => {
        sec++
        const tips = [this.$t('backtest-center.tip.fetching'), this.$t('backtest-center.tip.computing'), this.$t('backtest-center.tip.analyzing')]
        this.runTip = tips[Math.min(Math.floor(sec / 5), tips.length - 1)]
      }, 1000)
      try {
        const pct = v => Number(v || 0) / 100
        const response = await request({
          url: '/api/indicator/backtest',
          method: 'post',
          data: {
            userid: this.userId || 1,
            indicatorId: this.selectedIndicatorId,
            symbol: this.symbol,
            market: this.market,
            timeframe: this.timeframe,
            startDate: this.startDate.format('YYYY-MM-DD'),
            endDate: this.endDate.format('YYYY-MM-DD'),
            initialCapital: this.initialCapital,
            commission: pct(this.commission),
            slippage: pct(this.slippage),
            leverage: this.leverage,
            tradeDirection: this.tradeDirection,
            strategyConfig: {
              risk: { stopLossPct: pct(this.stopLossPct), takeProfitPct: pct(this.takeProfitPct), trailing: { enabled: this.trailingEnabled, pct: pct(this.trailingStopPct), activationPct: pct(this.trailingActivationPct) } },
              position: { entryPct: pct(this.entryPct) },
              scale: { trendAdd: { enabled: false }, dcaAdd: { enabled: false }, trendReduce: { enabled: false }, adverseReduce: { enabled: false } }
            },
            enableMtf: this.market && this.market.toLowerCase() === 'crypto'
          },
          timeout: 600000
        })
        if (response.code === 1 && response.data) {
          if (response.data.runId) this.backtestRunId = response.data.runId
          this.result = response.data.result || response.data
          this.hasResult = true
          this.$message.success(this.$t('backtest-center.result.success'))
        } else {
          this.$message.error(response.msg || this.$t('backtest-center.result.failed'))
        }
      } catch (e) {
        this.$message.error(e.message || this.$t('backtest-center.result.failed'))
      } finally {
        this.running = false
        clearInterval(this.runTimer)
        this.runTip = ''
      }
    },

    // ===== Run strategy backtest =====
    async runStrategyBacktest () {
      if (!this.canRunStrategy) return
      const s = this.selectedStrategyObj
      if (!s) return
      const indicatorId = s.indicator_config ? s.indicator_config.indicator_id : s.indicator_id
      if (!indicatorId) {
        this.$message.warning(this.$t('backtest-center.strategy.noIndicator'))
        return
      }
      this.stRunning = true
      this.stHasResult = false
      this.stRunTip = ''
      let sec = 0
      this.stRunTimer = setInterval(() => {
        sec++
        const tips = [this.$t('backtest-center.tip.fetching'), this.$t('backtest-center.tip.computing'), this.$t('backtest-center.tip.analyzing')]
        this.stRunTip = tips[Math.min(Math.floor(sec / 5), tips.length - 1)]
      }, 1000)
      try {
        const pct = v => Number(v || 0) / 100
        const tc = s.trading_config || {}
        const response = await request({
          url: '/api/indicator/backtest',
          method: 'post',
          data: {
            userid: this.userId || 1,
            indicatorId,
            symbol: this.stSymbol,
            market: this.stMarket,
            timeframe: this.stTimeframe,
            startDate: this.stStartDate.format('YYYY-MM-DD'),
            endDate: this.stEndDate.format('YYYY-MM-DD'),
            initialCapital: this.stInitialCapital,
            commission: pct(this.stCommission),
            slippage: pct(this.stSlippage),
            leverage: this.stLeverage,
            tradeDirection: tc.trade_direction || 'long',
            strategyConfig: {
              risk: {
                stopLossPct: pct(tc.stop_loss_pct || 0),
                takeProfitPct: pct(tc.take_profit_pct || 0),
                trailing: { enabled: !!tc.trailing_stop, pct: pct(tc.trailing_stop_pct || 0), activationPct: pct(tc.trailing_activation_pct || 0) }
              },
              position: { entryPct: pct(tc.entry_pct || 100) },
              scale: { trendAdd: { enabled: false }, dcaAdd: { enabled: false }, trendReduce: { enabled: false }, adverseReduce: { enabled: false } }
            },
            enableMtf: this.stMarket && this.stMarket.toLowerCase() === 'crypto'
          },
          timeout: 600000
        })
        if (response.code === 1 && response.data) {
          if (response.data.runId) this.stBacktestRunId = response.data.runId
          this.stResult = response.data.result || response.data
          this.stHasResult = true
          this.$message.success(this.$t('backtest-center.result.success'))
        } else {
          this.$message.error(response.msg || this.$t('backtest-center.result.failed'))
        }
      } catch (e) {
        this.$message.error(e.message || this.$t('backtest-center.result.failed'))
      } finally {
        this.stRunning = false
        clearInterval(this.stRunTimer)
        this.stRunTip = ''
      }
    },

    // ===== History =====
    openHistory (tab) {
      if (tab === 'strategy') {
        const s = this.selectedStrategyObj
        this.historyIndicatorId = s && s.indicator_config ? s.indicator_config.indicator_id : (s ? s.indicator_id : null)
      } else {
        this.historyIndicatorId = this.selectedIndicatorId || null
      }
      this.showHistoryDrawer = true
    },
    handleViewRun (run) {
      this.selectedRun = run
      this.showRunViewer = true
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;
.backtest-center {
  padding: 20px;
  min-height: calc(100vh - 120px);
}
.page-header {
  margin-bottom: 16px;
  .page-title {
    font-size: 22px; font-weight: 700; margin: 0 0 2px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    display: flex; align-items: center; gap: 10px;
    .title-icon { font-size: 24px; -webkit-text-fill-color: @primary-color; }
  }
  .page-subtitle { margin: 0; font-size: 13px; color: #8c8c8c; }
}
.main-tabs {
  /deep/ .ant-tabs-bar { margin-bottom: 14px; border-bottom: 2px solid #f0f0f0; }
  /deep/ .ant-tabs-tab { font-size: 15px; font-weight: 500; padding: 10px 20px; }
}

// ===== Config Panel =====
.config-col .config-panel {
  background: #fff; border-radius: 12px; padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  max-height: calc(100vh - 200px); overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 2px; }
}
.section {
  margin-bottom: 14px;
  .section-title {
    font-size: 11px; font-weight: 700; color: #8c8c8c; margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: 0.5px;
    display: flex; align-items: center; gap: 6px;
    .hint { font-weight: 400; color: #bfbfbf; font-size: 11px; text-transform: none; }
  }
}
.field-label { font-size: 11px; color: #8c8c8c; margin-bottom: 2px; }
.tf-group {
  display: flex; flex-wrap: wrap;
  /deep/ .ant-radio-button-wrapper { flex: 1; text-align: center; min-width: 36px; padding: 0 6px; }
}
.date-presets { display: flex; gap: 4px; flex-wrap: wrap; }
.run-section { margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.strategy-info { margin-top: 6px; }

// ===== Result Panel =====
.result-col .result-panel {
  background: #fff; border-radius: 12px; padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06); min-height: 500px;
}
.empty-result {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 450px;
  .empty-icon {
    width: 100px; height: 100px; border-radius: 50%;
    background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 24px; font-size: 42px; color: #1890ff;
  }
  h3 { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 8px; }
  p { font-size: 14px; color: #8c8c8c; max-width: 320px; text-align: center; line-height: 1.6; }
}
.running-overlay {
  display: flex; align-items: center; justify-content: center; min-height: 450px;
  .running-content { text-align: center; }
  .running-text { font-size: 17px; font-weight: 700; color: #333; margin-top: 20px; letter-spacing: 0.3px; }
  .running-sub { font-size: 13px; color: #8c8c8c; margin-top: 6px; min-height: 20px; }
}
.loading-pulse {
  position: relative; width: 80px; height: 80px; margin: 0 auto;
  .pulse-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 3px solid @primary-color;
    animation: pulseRing 1.5s ease-out infinite;
  }
  .pulse-icon {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: @primary-color; font-size: 28px;
    animation: pulseIcon 1.5s ease-in-out infinite;
  }
}
@keyframes pulseRing {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}
@keyframes pulseIcon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
.running-dots {
  display: flex; justify-content: center; gap: 6px; margin-top: 16px;
  .dot {
    width: 8px; height: 8px; border-radius: 50%; background: @primary-color;
    animation: dotBounce 1.4s ease-in-out infinite;
  }
  .dot1 { animation-delay: 0s; }
  .dot2 { animation-delay: 0.2s; }
  .dot3 { animation-delay: 0.4s; }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
.result-content { padding: 0; }
.result-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  .result-tag { display: flex; gap: 4px; }
  .run-id { font-size: 12px; color: #999; font-variant-numeric: tabular-nums; }
}
.metrics-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px;
}
.metric-card {
  background: #fafafa; border-radius: 10px; padding: 14px 12px; text-align: center; border: 1px solid #f0f0f0;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .metric-label { font-size: 11px; color: #8c8c8c; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
  .metric-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; color: #333; line-height: 1.2; }
  .metric-sub { font-size: 11px; color: #8c8c8c; margin-top: 4px; font-variant-numeric: tabular-nums; }
  &.positive .metric-value { color: #52c41a; }
  &.negative .metric-value { color: #f5222d; }
}
.chart-section {
  margin-bottom: 24px;
  .chart-title {
    font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px;
    display: flex; align-items: center;
  }
  .equity-chart { width: 100%; height: 300px; border-radius: 8px; }
}
.trades-section .chart-title {
  font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px;
  display: flex; align-items: center;
}

// add symbol modal
.add-item-active { background: #e6f7ff !important; }

// ===== Dark Theme =====
&.theme-dark {
  background: #141414;

  .page-header {
    .page-title {
      background: linear-gradient(135deg, #e0e6ed 0%, #c5ccd6 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      .title-icon { -webkit-text-fill-color: #40a9ff; }
    }
    .page-subtitle { color: rgba(255,255,255,0.45); }
  }

  .main-tabs {
    /deep/ .ant-tabs-bar { border-bottom-color: #303030; }
    /deep/ .ant-tabs-tab { color: rgba(255,255,255,0.65); &:hover { color: #fff; } }
    /deep/ .ant-tabs-tab-active { color: #177ddc !important; }
    /deep/ .ant-tabs-ink-bar { background: #177ddc; }
  }

  .config-panel {
    background: #1f1f1f;
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    &::-webkit-scrollbar-thumb { background: #434343; }
  }
  .section .section-title { color: rgba(255,255,255,0.65); .hint { color: rgba(255,255,255,0.35); } }
  .field-label { color: rgba(255,255,255,0.55); }

  /deep/ .ant-select .ant-select-selection {
    background: #141414; border-color: #434343; color: rgba(255,255,255,0.85);
    .ant-select-arrow { color: rgba(255,255,255,0.45); }
    &:hover { border-color: #177ddc; }
  }
  /deep/ .ant-select-selection__placeholder { color: rgba(255,255,255,0.35); }
  /deep/ .ant-input, /deep/ .ant-input-number {
    background: #141414; border-color: #434343; color: rgba(255,255,255,0.85);
    &:focus, &:hover { border-color: #177ddc; }
  }
  /deep/ .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  /deep/ .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: #177ddc; } }
  /deep/ .ant-calendar-picker-input { background: #141414; border-color: #434343; color: rgba(255,255,255,0.85); }
  /deep/ .ant-calendar-picker-icon { color: rgba(255,255,255,0.45); }
  /deep/ .ant-radio-button-wrapper {
    background: #141414; border-color: #434343; color: rgba(255,255,255,0.65);
    &:hover { color: #177ddc; }
    &.ant-radio-button-wrapper-checked { background: #177ddc; border-color: #177ddc; color: #fff; }
  }
  /deep/ .ant-checkbox-wrapper { color: rgba(255,255,255,0.85); }
  /deep/ .ant-checkbox-inner { background: #141414; border-color: #434343; }
  /deep/ .ant-btn-default {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65);
    &:hover { border-color: #177ddc; color: #177ddc; }
  }
  .run-section { border-top-color: #303030; }

  .result-panel {
    background: #1f1f1f;
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
  }

  .running-overlay {
    .running-text { color: rgba(255,255,255,0.85); }
    .running-sub { color: rgba(255,255,255,0.45); }
    .loading-pulse .pulse-ring { border-color: #177ddc; }
    .loading-pulse .pulse-icon { color: #177ddc; }
    .running-dots .dot { background: #177ddc; }
  }

  .empty-result {
    .empty-icon {
      background: linear-gradient(135deg, rgba(23,125,220,0.15) 0%, rgba(23,125,220,0.08) 100%);
      color: #177ddc;
    }
    h3 { color: rgba(255,255,255,0.85); }
    p { color: rgba(255,255,255,0.45); }
  }

  .result-header .run-id { color: rgba(255,255,255,0.45); }

  .metric-card {
    background: #141414; border-color: #303030;
    &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .metric-label { color: rgba(255,255,255,0.45); }
    .metric-value { color: rgba(255,255,255,0.85); }
    .metric-sub { color: rgba(255,255,255,0.35); }
    &.positive .metric-value { color: #49aa19; }
    &.negative .metric-value { color: #d32029; }
  }

  .chart-section .chart-title, .trades-section .chart-title { color: rgba(255,255,255,0.85); }

  /deep/ .ant-table {
    background: transparent; color: rgba(255,255,255,0.85);
    .ant-table-thead > tr > th { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); border-bottom-color: #303030; }
    .ant-table-tbody > tr > td { border-bottom-color: #303030; }
    .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.04); }
    .ant-table-placeholder { background: transparent; color: rgba(255,255,255,0.35); }
  }
  /deep/ .ant-pagination {
    .ant-pagination-item { background: #1f1f1f; border-color: #434343; a { color: rgba(255,255,255,0.65); } &.ant-pagination-item-active { border-color: #177ddc; a { color: #177ddc; } } }
    .ant-pagination-prev, .ant-pagination-next { .ant-pagination-item-link { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.45); } }
  }
  /deep/ .ant-empty-description { color: rgba(255,255,255,0.35); }
  /deep/ .ant-empty-image svg { fill: rgba(255,255,255,0.1); }
}
</style>
