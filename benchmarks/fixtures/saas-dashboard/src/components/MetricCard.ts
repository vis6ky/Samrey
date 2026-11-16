import { template, bindText } from '@samrey/runtime';
import { Metric } from '../stores/DashboardStore.js';

const _tmpl = template(`
  <div class="metric-card" role="region" aria-label="Metric card">
    <div class="label" ref="lbl"></div>
    <div class="value" ref="val"></div>
    <div class="change" ref="chg"></div>
  </div>
`);

export function MetricCard(props: { metric: Metric }) {
  const root = _tmpl.clone();
  const { lbl, val, chg } = root.refs;

  bindText(lbl, () => props.metric.label);
  bindText(val, () => props.metric.value.toLocaleString());
  bindText(chg, () => props.metric.change);

  return root;
}
