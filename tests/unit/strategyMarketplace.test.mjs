import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('desktop marketplace exposes queryable strategy compatibility filters', () => {
  const source = read('src/views/indicator-community/index.vue')
  for (const parameter of ['market', 'market_type', 'binding_mode', 'strategy_type', 'direction_mode', 'leverage']) {
    assert.match(source, new RegExp(`${parameter}:`))
  }
  assert.doesNotMatch(source, /filters\.timeframe/)
  assert.match(source, /activeStrategyFilterChips/)
})

test('desktop marketplace derives strategy markets from system market modules', () => {
  const source = read('src/views/indicator-community/index.vue')
  assert.match(source, /loadEnabledMarketOptions/)
  assert.match(source, /strategyMarketOptions/)
  assert.doesNotMatch(source, /strategyMarkets:\s*\[/)
})

test('marketplace typography keeps top-level tabs and controls on one scale', () => {
  const source = read('src/views/indicator-community/index.vue')
  assert.match(source, /--market-font-body: 14px;/)
  assert.match(source, /--market-font-control: 13px;/)
  assert.match(source, /\.admin-tabs[\s\S]*?\.ant-tabs-nav \.ant-tabs-tab \{[\s\S]*?font-size: var\(--market-font-body\);/)
  assert.match(source, /\.ant-tabs-nav \.ant-badge \{[\s\S]*?font: inherit;/)
})

test('indicator marketplace uses generated chart previews and removes decorative capability cards', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const ide = read('src/views/indicator-ide/index.vue')
  const chart = read('src/views/indicator-analysis/components/KlineChart.vue')

  assert.match(card, /:src="previewImage"/)
  assert.doesNotMatch(card, /class="visual-summary"/)
  assert.match(detail, /class="detail-preview"/)
  assert.doesNotMatch(detail, /class="section indicator-profile-section"/)
  assert.match(chart, /const captureMarketPreview = async/)
  assert.match(chart, /querySelectorAll\('canvas'\)/)
  assert.match(ide, /const chart = this\.\$refs\.klineChart/)
  assert.match(ide, /waitForRender: false/)
  assert.match(ide, /runtimeCheck: false/)
  assert.doesNotMatch(ide, /marketplacePreviewChart/)
  assert.match(ide, /url: '\/api\/indicator\/preview-image'/)
})

test('strategy marketplace stays compact and never renders indicator preview images', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const spotlight = read('src/views/indicator-community/components/MarketplaceSpotlight.vue')

  assert.match(card, /v-if="!isStrategyAsset" class="card-cover"/)
  assert.match(card, /v-if="isStrategyAsset" class="strategy-card-head"/)
  assert.match(spotlight, /v-if="!isStrategyAsset\(item\)" :src="item\.preview_image \|\| fallbackCover"/)
  assert.match(spotlight, /if \(this\.isStrategyAsset\(this\.featured\)\) return null/)
  assert.doesNotMatch(detail, /<template v-if="isStrategyAsset">[\s\S]*?<img/)
  assert.match(detail, /'detail-header--strategy': isStrategyAsset/)
})

test('dark marketplace detail uses neutral comment and body colors', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  assert.match(detail, /\.qd-indicator-detail-modal-wrap--dark[\s\S]*?color: #e5e5e5;/)
  assert.match(detail, /&\.is-mine \{[\s\S]*?background: #202020 !important;/)
  assert.match(detail, /\.comment-content \{ color: #c7c7c7; \}/)
})

test('desktop strategy cards separate execution and confirmation cadence', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  for (const field of ['execution_mode', 'execution_frequency', 'confirmation_frequencies']) {
    assert.match(card + detail, new RegExp(field))
  }
  assert.match(card + detail, /marketplace_contract/)
})

test('desktop strategy cards omit the overfitting risk prompt', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  assert.doesNotMatch(card, /overfit-risk-gauge|OverfitRiskGauge/)
})

test('marketplace labels payoff ratio separately from profit factor', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const review = read('src/views/indicator-community/index.vue')

  for (const source of [detail, review]) {
    assert.match(source, /strategyCenter\.backtest\.payoffRatio/)
    assert.match(source, /profit_loss_ratio/)
    assert.match(source, /losing_trades/)
  }
  assert.doesNotMatch(detail, /formatNumber\(performance\.profit_factor/)
  assert.doesNotMatch(review, /formatReviewNumber\(reviewPerformance\.profit_factor/)
})

test('purchased marketplace strategies expose direct live and code workflows', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const live = read('src/views/strategy-center/index.vue')
  const ide = read('src/views/strategy-ide/index.vue')

  assert.match(detail, /@click="deployPurchasedStrategy"/)
  assert.match(detail, /v-if="!codeHidden"[\s\S]*@click="viewPurchasedStrategyCode"/)
  assert.match(detail, /path: '\/strategy-center'[\s\S]*mode: 'create'[\s\S]*sourceId:/)
  assert.match(detail, /path: '\/strategy-ide'[\s\S]*sourceId:/)
  assert.doesNotMatch(detail, /compatibilityVisible|checkCompatibility|createAdaptedDraft/)
  assert.match(live, /'\$route\.fullPath'[\s\S]*openEditorFromRoute/)
  assert.match(live, /editorRouteSignature/)
  assert.match(ide, /'\$route\.query\.sourceId'[\s\S]*applyStrategyRouteSource/)
})

test('marketplace indicator use selects the purchased local copy even after cached navigation', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const ide = read('src/views/indicator-ide/index.vue')

  assert.match(detail, /detail\.local_copy_id[\s\S]*detail\.purchased_indicator_id[\s\S]*detail\.indicator_id/)
  assert.doesNotMatch(detail, /detail\.indicator_id \|\|\s*this\.detail\.id/)
  assert.match(ide, /activated \(\)[\s\S]*refreshIndicatorRouteSelection\(\)/)
  assert.match(ide, /refreshIndicatorRouteSelection \(\)[\s\S]*await this\.loadIndicators\(\)/)
  assert.match(ide, /this\.selectedIndicatorId = targetId[\s\S]*this\.chartVisibleIndicatorIds = \[targetId\][\s\S]*this\.onIndicatorChange\(targetId\)/)
})

test('strategy publishing guides users to a successful backtest with localized fallback handling', () => {
  const ide = read('src/views/strategy-ide/index.vue')
  const request = read('src/utils/request.js')
  const api = read('src/api/strategy.js')
  const english = read('src/locales/lang/en-US.js')
  const reviewedLocales = read('src/locales/reviewed-ui-overrides.js')

  assert.match(ide, /publishBacktestStatus !== 'passed'/)
  assert.match(ide, /goToBacktestFromPublish/)
  assert.match(ide, /isBacktestRequiredPublishResponse/)
  assert.match(ide, /publishBacktestRequiredHint/)
  assert.match(request, /normalizePublishBacktestRequiredError/)
  assert.match(request, /details\.requires_backtest/)
  assert.match(api, /script-sources\/publish-readiness/)
  assert.match(api, /params: \{ id: sourceId \}/)
  assert.match(english, /strategyIde\.publishGoBacktest/)
  assert.match(reviewedLocales, /strategyPublishBacktestCopy/)
  assert.doesNotMatch(english, /Please run code validation before publishing\./)
})

test('strategy republishing reports a marketplace update instead of another listing', () => {
  const ide = read('src/views/strategy-ide/index.vue')
  const english = read('src/locales/lang/en-US.js')
  const reviewedLocales = read('src/locales/reviewed-ui-overrides.js')

  assert.match(ide, /publication_action/)
  assert.match(ide, /publishUpdateSuccess/)
  assert.match(english, /strategyIde\.publishUpdateSuccess/)
  assert.match(reviewedLocales, /strategyPublishUpdateSuccessCopy/)
})
