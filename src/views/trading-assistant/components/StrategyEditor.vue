<template>
  <div class="strategy-editor" :class="{ 'theme-dark': isDark }">
    <a-row :gutter="16" class="editor-layout">
      <!-- Left: Code Editor -->
      <a-col :xs="24" :md="16" class="code-col">
        <div class="code-section">
          <div class="section-header">
            <span class="section-title">
              <a-icon type="code" /> {{ $t('trading-assistant.editor.title') }}
            </span>
            <div class="section-actions">
              <a-button
                type="link"
                size="small"
                @click="handleVerify"
                :loading="verifying"
                style="color: #52c41a; font-weight: 600;"
              >
                <a-icon type="check-circle" />
                {{ $t('trading-assistant.editor.verify') }}
              </a-button>
            </div>
          </div>
          <div ref="editorContainer" class="code-editor-container"></div>
        </div>
      </a-col>

      <!-- Right: AI Panel / Templates / Docs -->
      <a-col :xs="24" :md="8" class="side-col">
        <a-tabs v-model="activeTab" size="small" class="side-tabs">
          <a-tab-pane key="templates" :tab="$t('trading-assistant.editor.templateTab')">
            <div class="template-list">
              <div
                v-for="tpl in templates"
                :key="tpl.key"
                class="template-item"
                @click="loadTemplate(tpl.key)"
              >
                <div class="tpl-header">
                  <span class="tpl-icon">{{ tpl.icon }}</span>
                  <span class="tpl-name">{{ $t(`trading-assistant.template.${tpl.key}`) }}</span>
                </div>
                <p class="tpl-desc">{{ $t(`trading-assistant.template.${tpl.key}Desc`) }}</p>
                <a-button type="link" size="small" class="tpl-use-btn">
                  {{ $t('trading-assistant.template.useTemplate') }}
                  <a-icon type="arrow-right" />
                </a-button>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="ai" :tab="$t('trading-assistant.editor.aiTab')">
            <div class="ai-panel">
              <div class="ai-panel-title">
                <a-icon type="robot" />
                <span>{{ $t('trading-assistant.editor.aiGenerate') }}</span>
              </div>
              <a-textarea
                v-model="aiPrompt"
                :placeholder="$t('trading-assistant.editor.aiPromptPlaceholder')"
                :rows="10"
                :auto-size="{ minRows: 8, maxRows: 16 }"
              />
              <a-button
                type="primary"
                block
                @click="handleAIGenerate"
                :loading="aiGenerating"
                size="large"
                style="margin-top: 10px;"
              >
                <a-icon type="thunderbolt" />
                {{ $t('trading-assistant.editor.aiGenerateBtn') }}
              </a-button>
              <div v-if="aiGenerating" class="ai-status">
                <a-icon type="loading" spin /> {{ $t('trading-assistant.editor.generating') }}
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="docs" :tab="$t('trading-assistant.editor.docsTab')">
            <div class="docs-panel">
              <div class="docs-content" v-html="apiDocsHtml"></div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { message } from 'ant-design-vue'
import request from '@/utils/request'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'

const STRATEGY_TEMPLATES = {
  trendFollowing: `"""
Trend Following Strategy
Uses EMA crossover with dynamic stop-loss
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 12)
    ctx.slow_period = ctx.param('slow_period', 26)
    ctx.stop_pct = ctx.param('stop_pct', 0.03)

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.slow_period + 5)
    if len(bars) < ctx.slow_period:
        return

    closes = [b['close'] for b in bars]
    fast_ema = _ema(closes, ctx.fast_period)
    slow_ema = _ema(closes, ctx.slow_period)

    if fast_ema > slow_ema and not ctx.position:
        ctx.buy(bar['close'], ctx.equity * 0.95 / bar['close'])
        ctx.log(f"BUY at {bar['close']:.2f}")

    elif fast_ema < slow_ema and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"SELL at {bar['close']:.2f}")

    if ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        if bar['close'] < entry * (1 - ctx.stop_pct):
            ctx.close_position()
            ctx.log(f"STOP LOSS at {bar['close']:.2f}")

def _ema(data, period):
    k = 2 / (period + 1)
    ema = data[0]
    for price in data[1:]:
        ema = price * k + ema * (1 - k)
    return ema
`,
  martingale: `"""
Martingale Strategy
Double position on each loss, with max layer control
"""

def on_init(ctx):
    ctx.base_amount = ctx.param('base_amount', 100)
    ctx.max_layers = ctx.param('max_layers', 5)
    ctx.multiplier = ctx.param('multiplier', 2.0)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.02)
    ctx.current_layer = 0

def on_bar(ctx, bar):
    if not ctx.position:
        amount = ctx.base_amount * (ctx.multiplier ** ctx.current_layer)
        if amount <= ctx.balance:
            qty = amount / bar['close']
            ctx.buy(bar['close'], qty)
            ctx.log(f"Layer {ctx.current_layer}: BUY {qty:.4f} at {bar['close']:.2f}")
    else:
        entry = ctx.position['entry_price']
        pnl_pct = (bar['close'] - entry) / entry

        if pnl_pct >= ctx.take_profit_pct:
            ctx.close_position()
            ctx.current_layer = 0
            ctx.log(f"TAKE PROFIT at {bar['close']:.2f}, reset layers")

        elif pnl_pct <= -ctx.take_profit_pct:
            ctx.close_position()
            if ctx.current_layer < ctx.max_layers:
                ctx.current_layer += 1
                ctx.log(f"LOSS, escalate to layer {ctx.current_layer}")
            else:
                ctx.current_layer = 0
                ctx.log(f"Max layers reached, reset")
`,
  grid: `"""
Grid Trading Strategy
Places buy/sell orders at equal intervals within a price range
"""

def on_init(ctx):
    ctx.grid_upper = ctx.param('grid_upper', 70000)
    ctx.grid_lower = ctx.param('grid_lower', 60000)
    ctx.grid_levels = ctx.param('grid_levels', 10)
    ctx.order_amount = ctx.param('order_amount', 100)
    ctx.filled_grids = set()

    spacing = (ctx.grid_upper - ctx.grid_lower) / ctx.grid_levels
    ctx.grid_prices = [ctx.grid_lower + i * spacing for i in range(ctx.grid_levels + 1)]

def on_bar(ctx, bar):
    price = bar['close']
    if price < ctx.grid_lower or price > ctx.grid_upper:
        return

    for i, gp in enumerate(ctx.grid_prices[:-1]):
        upper_gp = ctx.grid_prices[i + 1]
        grid_id = f"grid_{i}"

        if price <= gp and grid_id not in ctx.filled_grids:
            qty = ctx.order_amount / price
            ctx.buy(price, qty)
            ctx.filled_grids.add(grid_id)
            ctx.log(f"Grid BUY at {price:.2f} (level {i})")

        elif price >= upper_gp and grid_id in ctx.filled_grids:
            qty = ctx.order_amount / price
            ctx.sell(price, qty)
            ctx.filled_grids.discard(grid_id)
            ctx.log(f"Grid SELL at {price:.2f} (level {i})")
`,
  dca: `"""
DCA (Dollar Cost Averaging) Strategy
Periodic purchases with optional dip-buying
"""

def on_init(ctx):
    ctx.buy_amount = ctx.param('buy_amount', 100)
    ctx.dip_threshold = ctx.param('dip_threshold', 0.05)
    ctx.dip_multiplier = ctx.param('dip_multiplier', 2.0)
    ctx.bar_count = 0
    ctx.buy_interval = ctx.param('buy_interval', 24)
    ctx.last_buy_price = None

def on_bar(ctx, bar):
    ctx.bar_count += 1
    price = bar['close']

    is_dip = False
    if ctx.last_buy_price and price < ctx.last_buy_price * (1 - ctx.dip_threshold):
        is_dip = True

    if ctx.bar_count % ctx.buy_interval == 0 or is_dip:
        amount = ctx.buy_amount * (ctx.dip_multiplier if is_dip else 1.0)
        if amount <= ctx.balance:
            qty = amount / price
            ctx.buy(price, qty)
            ctx.last_buy_price = price
            tag = " (DIP BUY)" if is_dip else ""
            ctx.log(f"DCA BUY {qty:.6f} at {price:.2f}{tag}")
`,
  meanReversion: `"""
Mean Reversion Strategy
Bollinger Bands based: buy at lower band, sell at upper band
"""

def on_init(ctx):
    ctx.period = ctx.param('period', 20)
    ctx.std_mult = ctx.param('std_mult', 2.0)
    ctx.position_pct = ctx.param('position_pct', 0.5)

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.period + 5)
    if len(bars) < ctx.period:
        return

    closes = [b['close'] for b in bars[-ctx.period:]]
    mean = sum(closes) / len(closes)
    std = (sum((c - mean) ** 2 for c in closes) / len(closes)) ** 0.5

    upper = mean + ctx.std_mult * std
    lower = mean - ctx.std_mult * std
    price = bar['close']

    if price <= lower and not ctx.position:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.buy(price, qty)
        ctx.log(f"BUY at {price:.2f} (below lower band {lower:.2f})")

    elif price >= upper and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"SELL at {price:.2f} (above upper band {upper:.2f})")

    elif price >= mean and ctx.position and ctx.position['side'] == 'long':
        pnl_pct = (price - ctx.position['entry_price']) / ctx.position['entry_price']
        if pnl_pct > 0.01:
            ctx.close_position()
            ctx.log(f"CLOSE at mean {price:.2f}, profit {pnl_pct:.2%}")
`,
  breakout: `"""
Breakout Strategy
Enter when price breaks key resistance/support with volume confirmation
"""

def on_init(ctx):
    ctx.lookback = ctx.param('lookback', 20)
    ctx.volume_mult = ctx.param('volume_mult', 1.5)
    ctx.stop_pct = ctx.param('stop_pct', 0.02)

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.lookback + 5)
    if len(bars) < ctx.lookback:
        return

    recent = bars[-ctx.lookback:]
    high = max(b['high'] for b in recent[:-1])
    low = min(b['low'] for b in recent[:-1])
    avg_vol = sum(b['volume'] for b in recent[:-1]) / (len(recent) - 1)
    price = bar['close']
    vol = bar['volume']

    if price > high and vol > avg_vol * ctx.volume_mult and not ctx.position:
        qty = (ctx.equity * 0.9) / price
        ctx.buy(price, qty)
        ctx.log(f"BREAKOUT BUY at {price:.2f} (prev high: {high:.2f})")

    elif price < low and ctx.position and ctx.position['side'] == 'long':
        ctx.close_position()
        ctx.log(f"BREAK DOWN, close at {price:.2f}")

    if ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        if price < entry * (1 - ctx.stop_pct):
            ctx.close_position()
            ctx.log(f"STOP LOSS at {price:.2f}")
`
}

const API_DOCS_MD = `
<h4>Strategy API Reference</h4>
<h5>Lifecycle Functions</h5>
<pre><code>def on_init(ctx):
    """Called once when strategy starts"""

def on_bar(ctx, bar):
    """Called on each new K-line bar"""
    # bar: { open, high, low, close, volume, timestamp }

def on_order_filled(ctx, order):
    """Called when an order is filled"""

def on_stop(ctx):
    """Called when strategy stops"""</code></pre>

<h5>Trading Actions</h5>
<pre><code>ctx.buy(price, amount)     # Buy / Go long
ctx.sell(price, amount)    # Sell / Go short
ctx.close_position()       # Close current position
ctx.cancel_all_orders()    # Cancel pending orders</code></pre>

<h5>Context Properties</h5>
<pre><code>ctx.position       # { side, amount, entry_price, unrealized_pnl }
ctx.balance        # Available balance
ctx.equity         # Total equity
ctx.current_price  # Current market price
ctx.symbol         # Trading symbol
ctx.timeframe      # K-line timeframe</code></pre>

<h5>Data Access</h5>
<pre><code>ctx.bars(n=100)         # Get last N bars
ctx.param(name, default) # Get strategy parameter
ctx.indicator(id, params) # Call existing indicator
ctx.log(message)         # Log a message</code></pre>
`

export default {
  name: 'StrategyEditor',
  props: {
    value: { type: String, default: '' },
    isDark: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 1 }
  },
  data () {
    return {
      activeTab: 'templates',
      aiPrompt: '',
      aiGenerating: false,
      verifying: false,
      editor: null,
      apiDocsHtml: API_DOCS_MD,
      templates: [
        { key: 'trendFollowing', icon: '📈' },
        { key: 'martingale', icon: '🔥' },
        { key: 'grid', icon: '📐' },
        { key: 'dca', icon: '💰' },
        { key: 'meanReversion', icon: '🔄' },
        { key: 'breakout', icon: '⚡' }
      ]
    }
  },
  mounted () {
    this.$nextTick(() => this.initEditor())
  },
  beforeDestroy () {
    if (this.editor) {
      if (typeof this.editor.toTextArea === 'function') {
        this.editor.toTextArea()
      }
      this.editor = null
    }
  },
  watch: {
    value (newVal) {
      if (this.editor && this.editor.getValue() !== newVal) {
        this.editor.setValue(newVal || '')
      }
    },
    isDark () {
      if (this.editor) {
        this.editor.setOption('theme', this.isDark ? 'monokai' : 'eclipse')
      }
    }
  },
  methods: {
    initEditor () {
      if (!this.$refs.editorContainer) return
      this.editor = CodeMirror(this.$refs.editorContainer, {
        value: this.value || this._getDefaultCode(),
        mode: 'python',
        theme: this.isDark ? 'monokai' : 'eclipse',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        tabSize: 4,
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: true,
        viewportMargin: Infinity
      })
      this.editor.on('change', () => {
        this.$emit('input', this.editor.getValue())
      })
    },

    _getDefaultCode () {
      return `"""
My Custom Strategy
"""

def on_init(ctx):
    # Initialize strategy parameters
    pass

def on_bar(ctx, bar):
    # Core trading logic, called on each K-line bar
    # bar: { open, high, low, close, volume, timestamp }
    price = bar['close']

    # Example: simple moving average
    bars = ctx.bars(20)
    if len(bars) < 20:
        return

    avg = sum(b['close'] for b in bars) / len(bars)

    if price > avg and not ctx.position:
        ctx.buy(price, ctx.equity * 0.9 / price)
        ctx.log(f"BUY at {price}")

    elif price < avg and ctx.position:
        ctx.close_position()
        ctx.log(f"SELL at {price}")
`
    },

    loadTemplate (key) {
      const code = STRATEGY_TEMPLATES[key]
      if (code) {
        if (this.editor) {
          this.editor.setValue(code)
        }
        this.$emit('input', code)
        this.activeTab = 'ai'
      }
    },

    getCode () {
      return this.editor ? this.editor.getValue() : this.value
    },

    setCode (code) {
      if (this.editor) {
        this.editor.setValue(code)
      }
      this.$emit('input', code)
    },

    async handleVerify () {
      this.verifying = true
      try {
        const code = this.getCode()
        const res = await request({
          url: '/api/strategies/verify-code',
          method: 'post',
          data: { code, user_id: this.userId }
        })
        if (res && res.success) {
          message.success(this.$t('trading-assistant.editor.verifySuccess'))
        } else {
          message.error((res && res.message) || this.$t('trading-assistant.editor.verifyFailed'))
        }
      } catch (e) {
        message.error(this.$t('trading-assistant.editor.verifyFailed') + ': ' + (e.message || ''))
      } finally {
        this.verifying = false
      }
    },

    async handleAIGenerate () {
      if (!this.aiPrompt.trim()) return
      this.aiGenerating = true
      try {
        const res = await request({
          url: '/api/strategies/ai-generate',
          method: 'post',
          data: { prompt: this.aiPrompt, user_id: this.userId }
        })
        if (res && res.code) {
          this.setCode(res.code)
          message.success('OK')
        }
      } catch (e) {
        message.error('AI generation failed: ' + (e.message || ''))
      } finally {
        this.aiGenerating = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-editor {
  width: 100%;
}

.editor-layout {
  min-height: 450px;
}

.code-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;

  .section-title {
    font-weight: 600;
    font-size: 14px;

    .anticon {
      margin-right: 6px;
    }
  }
}

.code-editor-container {
  height: 420px;
  width: 100%;

  /deep/ .CodeMirror {
    height: 100%;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.6;
  }
}

.side-tabs {
  height: 100%;

  /deep/ .ant-tabs-content {
    height: calc(100% - 40px);
    overflow-y: auto;
  }
}

.template-list {
  padding: 4px 0;
}

.template-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1890ff;
    background: #fafafa;
  }

  .tpl-header {
    display: flex;
    align-items: center;
    margin-bottom: 4px;

    .tpl-icon {
      font-size: 16px;
      margin-right: 8px;
    }

    .tpl-name {
      font-weight: 600;
      font-size: 14px;
    }
  }

  .tpl-desc {
    font-size: 12px;
    color: #888;
    margin: 0 0 4px;
  }

  .tpl-use-btn {
    padding: 0;
    font-size: 12px;
  }
}

.ai-panel {
  padding: 4px 0;

  .ai-panel-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;

    .anticon {
      margin-right: 6px;
      color: #1890ff;
    }
  }

  .ai-status {
    margin-top: 8px;
    color: #1890ff;
    font-size: 13px;
    text-align: center;
  }
}

.docs-panel {
  padding: 4px 0;

  .docs-content {
    font-size: 13px;
    line-height: 1.6;

    /deep/ h4 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    /deep/ h5 {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 8px;
      color: #1890ff;
    }

    /deep/ pre {
      background: #f6f8fa;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }

    /deep/ code {
      font-family: 'Fira Code', 'Consolas', monospace;
    }
  }
}

.theme-dark {
  .code-section {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .section-header {
    background: #1a1e28;
    border-color: rgba(255, 255, 255, 0.1);

    .section-title {
      color: #e0e6ed;
    }
  }

  .side-tabs {
    /deep/ .ant-tabs-nav .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.55);

      &:hover {
        color: rgba(255, 255, 255, 0.85);
      }

      &.ant-tabs-tab-active .ant-tabs-tab-btn {
        color: #1890ff;
      }
    }

    /deep/ .ant-tabs-bar {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }
  }

  .template-item {
    border-color: rgba(255, 255, 255, 0.08);
    background: #1a1e28;

    &:hover {
      border-color: #177ddc;
      background: rgba(23, 125, 220, 0.06);
    }

    .tpl-name {
      color: #e0e6ed;
    }

    .tpl-desc {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .ai-panel {
    .ai-panel-title {
      color: #e0e6ed;

      .anticon {
        color: #40a9ff;
      }
    }

    /deep/ textarea.ant-input {
      background: #141821;
      border-color: rgba(255, 255, 255, 0.1);
      color: #d1d4dc;

      &::placeholder {
        color: rgba(255, 255, 255, 0.25);
      }

      &:focus {
        border-color: #1890ff;
      }
    }

    .ai-status {
      color: #40a9ff;
    }
  }

  .docs-panel .docs-content {
    color: rgba(255, 255, 255, 0.75);

    /deep/ h4 {
      color: #e0e6ed;
    }

    /deep/ h5 {
      color: #40a9ff;
    }

    /deep/ pre {
      background: #141821;
      color: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
  }
}
</style>
