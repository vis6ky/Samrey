import { signal, computed } from '@samrey/reactivity';

export type CustomerStage = 'Lead' | 'Negotiation' | 'Won' | 'Lost';

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  dealValue: number;
  stage: CustomerStage;
}

export function createCrmStore() {
  const customers = signal<Customer[]>([
    { id: 'c1', name: 'Dr. Jane Goodall', company: 'Primate Research Foundation', email: 'jane@primate.org', dealValue: 24000, stage: 'Won' },
    { id: 'c2', name: 'Linus Torvalds', company: 'Open Source Software', email: 'torvalds@kernel.org', dealValue: 50000, stage: 'Negotiation' },
    { id: 'c3', name: 'Katherine Johnson', company: 'Orbital Dynamics Lab', email: 'kjohnson@nasa.gov', dealValue: 75000, stage: 'Won' }
  ]);

  const activeStageFilter = signal<'All' | CustomerStage>('All');

  const filteredCustomers = computed(() => {
    if (activeStageFilter.value === 'All') return customers.value;
    return customers.value.filter(c => c.stage === activeStageFilter.value);
  });

  const totalPipelineValue = computed(() => {
    return customers.value.reduce((acc, c) => acc + c.dealValue, 0);
  });

  const wonDealsValue = computed(() => {
    return customers.value.filter(c => c.stage === 'Won').reduce((acc, c) => acc + c.dealValue, 0);
  });

  const winRate = computed(() => {
    if (customers.value.length === 0) return 0;
    const wonCount = customers.value.filter(c => c.stage === 'Won').length;
    return Math.round((wonCount / customers.value.length) * 100);
  });

  return {
    customers,
    activeStageFilter,
    filteredCustomers,
    totalPipelineValue,
    wonDealsValue,
    winRate,
    addCustomer: (cust: Omit<Customer, 'id'>) => {
      const newCust: Customer = { id: `c_${Date.now()}`, ...cust };
      customers.value = [...customers.value, newCust];
    },
    updateStage: (id: string, stage: CustomerStage) => {
      customers.update(list => list.map(c => c.id === id ? { ...c, stage } : c));
    },
    deleteCustomer: (id: string) => {
      customers.update(list => list.filter(c => c.id !== id));
    }
  };
}
