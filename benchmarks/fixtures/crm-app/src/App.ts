import { template, bindText, on, For } from '@samrey/runtime';
import { createCrmStore, CustomerStage } from './stores/CrmStore.js';
import { CustomerForm } from './components/CustomerForm.js';

const _tmpl = template(`
  <div class="crm-application">
    <header>
      <h1>Enterprise CRM & Deal Analytics</h1>
      <div class="analytics-strip">
        <div class="stat">Pipeline: $<span ref="pipelineVal"></span></div>
        <div class="stat">Won Deals: $<span ref="wonVal"></span></div>
        <div class="stat">Win Rate: <span ref="winRate"></span>%</div>
      </div>
    </header>
    <div class="crm-body">
      <aside class="create-customer-pane" ref="formPane"></aside>
      <main class="customer-pipeline">
        <div class="filter-tabs">
          <button ref="btnAll">All</button>
          <button ref="btnWon">Won Deals</button>
          <button ref="btnLead">Leads</button>
        </div>
        <table class="crm-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Company</th>
              <th>Deal ($)</th>
              <th>Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody ref="tableBody"></tbody>
        </table>
      </main>
    </div>
  </div>
`);

const _rowTmpl = template(`
  <tr class="cust-row">
    <td ref="cName"></td>
    <td ref="cComp"></td>
    <td ref="cVal"></td>
    <td><span class="stage-badge" ref="cStage"></span></td>
    <td>
      <button ref="btnWin">Win</button>
      <button ref="btnDel">Delete</button>
    </td>
  </tr>
`);

export function CrmApp() {
  const store = createCrmStore();
  const root = _tmpl.clone();
  const { pipelineVal, wonVal, winRate, formPane, btnAll, btnWon, btnLead, tableBody } = root.refs;

  bindText(pipelineVal, () => store.totalPipelineValue.value.toLocaleString());
  bindText(wonVal, () => store.wonDealsValue.value.toLocaleString());
  bindText(winRate, () => store.winRate.value.toString());

  on(btnAll, 'click', () => { store.activeStageFilter.value = 'All'; });
  on(btnWon, 'click', () => { store.activeStageFilter.value = 'Won'; });
  on(btnLead, 'click', () => { store.activeStageFilter.value = 'Lead'; });

  // Mount form
  formPane.appendChild(CustomerForm({
    onSubmitCustomer: (c) => store.addCustomer(c)
  }));

  // Mount customer table rows
  tableBody.appendChild(
    For({
      each: () => store.filteredCustomers.value,
      key: (c) => `${c.id}_${c.stage}`,
      children: (c) => {
        const row = _rowTmpl.clone();
        const { cName, cComp, cVal, cStage, btnWin, btnDel } = row.refs;

        bindText(cName, () => c.name);
        bindText(cComp, () => c.company);
        bindText(cVal, () => `$${c.dealValue.toLocaleString()}`);
        bindText(cStage, () => c.stage);

        on(btnWin, 'click', () => store.updateStage(c.id, 'Won'));
        on(btnDel, 'click', () => store.deleteCustomer(c.id));

        return row;
      }
    })
  );

  return { root, store };
}
