function finiteNumber (value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function nearestTimestampIndex (rows, timestamp) {
  if (!rows.length || !Number.isFinite(timestamp)) return -1
  let nearestIndex = -1
  let nearestDistance = Number.POSITIVE_INFINITY
  rows.forEach((row, index) => {
    const current = finiteNumber(row && row.timestamp)
    if (current === null) return
    const distance = Math.abs(current - timestamp)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })
  return nearestIndex
}

export function captureChartViewport (chart, tolerance = 1) {
  if (!chart || typeof chart.getVisibleRange !== 'function' || typeof chart.getDataList !== 'function') {
    return null
  }

  const rows = chart.getDataList()
  const range = chart.getVisibleRange()
  if (!Array.isArray(rows) || rows.length === 0 || !range) return null

  const visibleFrom = finiteNumber(range.from)
  const realTo = finiteNumber(range.realTo)
  const visibleTo = finiteNumber(range.to)
  const rightEdge = realTo ?? visibleTo
  const followingLatest = rightEdge === null || rightEdge >= rows.length - 1 - Math.max(0, tolerance)
  if (followingLatest) return { followingLatest: true }

  const anchorPosition = Math.max(0, visibleTo ?? realTo ?? visibleFrom ?? 0)
  const anchorIndex = Math.min(rows.length - 1, Math.floor(anchorPosition))
  const anchorTimestamp = finiteNumber(rows[anchorIndex] && rows[anchorIndex].timestamp)
  if (anchorTimestamp === null) return null

  return {
    followingLatest: false,
    anchorTimestamp,
    fallbackIndex: anchorIndex
  }
}

export function restoreChartViewport (chart, snapshot) {
  if (!chart || !snapshot || snapshot.followingLatest || typeof chart.scrollToDataIndex !== 'function') {
    return false
  }

  const rows = typeof chart.getDataList === 'function' ? chart.getDataList() : []
  const anchorIndex = nearestTimestampIndex(Array.isArray(rows) ? rows : [], snapshot.anchorTimestamp)
  const targetIndex = anchorIndex >= 0
    ? anchorIndex
    : Number(snapshot.fallbackIndex || 0)
  chart.scrollToDataIndex(Math.max(0, Math.round(targetIndex)), 0)
  return true
}
