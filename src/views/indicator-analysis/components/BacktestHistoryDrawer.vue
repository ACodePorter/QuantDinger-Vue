<template>
  <a-drawer
    :title="$t('dashboard.indicator.backtest.historyTitle')"
    :visible="visible"
    :width="isMobile ? '100%' : 1060"
    :maskClosable="true"
    @close="$emit('cancel')"
    class="backtest-history-drawer"
  >
    <!-- 顶部工具栏 -->
    <div class="drawer-toolbar">
      <div class="toolbar-left">
        <a-button type="primary" :loading="loading" icon="reload" size="small" @click="loadRuns">
          {{ $t('dashboard.indicator.backtest.historyRefresh') }}
        </a-button>
        <a-button
          type="primary"
          ghost
          size="small"
          :disabled="selectedRowKeys.length === 0"
          :loading="analyzing"
          @click="handleAIAnalyze"
        >
          <a-icon type="bulb" />
          {{ $t('dashboard.indicator.backtest.historyAISuggest') }}
        </a-button>
      </div>
      <div class="toolbar-right">
        <a-input
          v-model="filterSymbol"
          style="width: 160px"
          size="small"
          allow-clear
          :placeholder="$t('dashboard.indicator.backtest.historyFilterSymbol')"
          @change="debouncedLoad"
        />
        <a-select
          v-model="filterTimeframe"
          style="width: 100px"
          size="small"
          :placeholder="$t('dashboard.indicator.backtest.historyFilterTimeframe')"
          allow-clear
          @change="loadRuns"
        >
          <a-select-option v-for="tf in timeframes" :key="tf" :value="tf">{{ tf }}</a-select-option>
        </a-select>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="runs"
      :loading="loading"
      size="small"
      :pagination="{ pageSize: 15, size: 'small' }"
      rowKey="id"
      :scroll="{ x: 1000 }"
      :rowSelection="{ selectedRowKeys: selectedRowKeys, onChange: onRowSelectionChange }"
    >
      <template slot="symbol" slot-scope="text, record">
        <span style="font-weight: 600;">{{ record.symbol || '-' }}</span>
        <a-tag v-if="record.market" size="small" style="margin-left: 4px;">{{ record.market }}</a-tag>
      </template>
      <template slot="range" slot-scope="text, record">
        <span>{{ (record.start_date || '').slice(0, 10) }} ~ {{ (record.end_date || '').slice(0, 10) }}</span>
      </template>
      <template slot="returnPct" slot-scope="text">
        <span v-if="text !== null && text !== undefined" :style="{ color: text >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }">
          {{ text >= 0 ? '+' : '' }}{{ (text * 100).toFixed(2) }}%
        </span>
        <span v-else>-</span>
      </template>
      <template slot="status" slot-scope="text">
        <a-tag :color="text === 'success' ? 'green' : text === 'failed' ? 'red' : 'blue'">
          {{ text === 'success' ? $t('dashboard.indicator.backtest.historyStatusSuccess') : text === 'failed' ? $t('dashboard.indicator.backtest.historyStatusFailed') : text }}
        </a-tag>
      </template>
      <template slot="actions" slot-scope="text, record">
        <a-button type="link" size="small" :loading="detailLoadingId === record.id" @click="viewRun(record)">
          {{ $t('dashboard.indicator.backtest.historyView') }}
        </a-button>
      </template>
    </a-table>

    <a-empty v-if="!loading && runs.length === 0" :description="$t('dashboard.indicator.backtest.historyNoData')" />

    <!-- AI 修正建议 Modal -->
    <a-modal
      :title="$t('dashboard.indicator.backtest.historyAISuggestTitle')"
      :visible="showAIResult"
      :footer="null"
      :width="isMobile ? '100%' : 900"
      @cancel="showAIResult = false"
    >
      <div v-if="analyzing" style="padding: 24px 0; text-align: center;">
        <a-spin size="large" />
        <div style="margin-top: 12px; color: #999;">{{ $t('dashboard.indicator.backtest.historyAISuggestLoading') }}</div>
      </div>
      <div v-else class="ai-result-content">
        {{ aiResult || $t('dashboard.indicator.backtest.historyNoAIResult') }}
      </div>
    </a-modal>
  </a-drawer>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'BacktestHistoryDrawer',
  props: {
    visible: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 1 },
    indicatorId: { type: [Number, String], default: null },
    symbol: { type: String, default: '' },
    market: { type: String, default: '' },
    timeframe: { type: String, default: '' },
    isMobile: { type: Boolean, default: false }
  },
  data () {
    return {
      loading: false,
      detailLoadingId: null,
      analyzing: false,
      showAIResult: false,
      aiResult: '',
      filterSymbol: '',
      filterTimeframe: undefined,
      timeframes: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
      runs: [],
      columns: [],
      selectedRowKeys: [],
      debounceTimer: null
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.initColumns()
        this.filterSymbol = ''
        this.filterTimeframe = undefined
        this.selectedRowKeys = []
        this.aiResult = ''
        this.showAIResult = false
        this.loadRuns()
      }
    }
  },
  methods: {
    onRowSelectionChange (keys) {
      this.selectedRowKeys = keys || []
    },
    debouncedLoad () {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => this.loadRuns(), 400)
    },
    initColumns () {
      this.columns = [
        { title: '#', dataIndex: 'id', key: 'id', width: 60 },
        { title: this.$t('dashboard.indicator.backtest.historySymbol') || 'Symbol', key: 'symbol', width: 150, scopedSlots: { customRender: 'symbol' } },
        { title: this.$t('dashboard.indicator.backtest.timeframe') || 'TF', dataIndex: 'timeframe', key: 'timeframe', width: 70 },
        { title: this.$t('dashboard.indicator.backtest.historyRange'), key: 'range', width: 180, scopedSlots: { customRender: 'range' } },
        { title: this.$t('dashboard.indicator.backtest.tradeDirection'), dataIndex: 'trade_direction', key: 'trade_direction', width: 80 },
        { title: this.$t('dashboard.indicator.backtest.leverage'), dataIndex: 'leverage', key: 'leverage', width: 60 },
        { title: this.$t('dashboard.indicator.backtest.totalReturn') || 'Return', dataIndex: 'total_return', key: 'total_return', width: 100, scopedSlots: { customRender: 'returnPct' } },
        { title: this.$t('dashboard.indicator.backtest.historyStatus'), dataIndex: 'status', key: 'status', width: 80, scopedSlots: { customRender: 'status' } },
        { title: this.$t('dashboard.indicator.backtest.historyCreatedAt'), dataIndex: 'created_at', key: 'created_at', width: 130 },
        { title: '', key: 'actions', width: 70, scopedSlots: { customRender: 'actions' } }
      ]
    },
    async loadRuns () {
      if (!this.userId) return
      this.loading = true
      try {
        const params = {
          userid: this.userId,
          limit: 200,
          offset: 0
        }
        if (this.indicatorId) params.indicatorId = this.indicatorId
        if (this.filterSymbol) params.symbol = this.filterSymbol
        if (this.filterTimeframe) params.timeframe = this.filterTimeframe
        const res = await request({
          url: '/api/indicator/backtest/history',
          method: 'get',
          params
        })
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.runs = res.data
        } else {
          this.runs = []
        }
      } finally {
        this.loading = false
      }
    },
    async viewRun (record) {
      if (!record || !record.id) return
      this.detailLoadingId = record.id
      try {
        const res = await request({
          url: '/api/indicator/backtest/get',
          method: 'get',
          params: { userid: this.userId, runId: record.id }
        })
        if (res && res.code === 1 && res.data) {
          this.$emit('view', res.data)
        }
      } finally {
        this.detailLoadingId = null
      }
    },
    async handleAIAnalyze () {
      if (!this.userId || !this.selectedRowKeys.length) return
      this.analyzing = true
      this.showAIResult = true
      this.aiResult = ''
      try {
        const lang = (this.$i18n && this.$i18n.locale) ? this.$i18n.locale : 'zh-CN'
        const res = await request({
          url: '/api/indicator/backtest/aiAnalyze',
          method: 'post',
          data: { userid: this.userId, runIds: this.selectedRowKeys, lang }
        })
        if (res && res.code === 1 && res.data && res.data.analysis) {
          this.aiResult = res.data.analysis
        } else {
          this.aiResult = res.msg || this.$t('dashboard.indicator.backtest.historyNoAIResult')
        }
      } finally {
        this.analyzing = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.drawer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
.ai-result-content {
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  padding: 8px 0;
}
</style>
