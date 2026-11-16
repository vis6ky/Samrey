/**
 * @license Apache-2.0
 * Samrey Framework — Application Architecture Planner
 */

export interface ComponentPlan {
  name: string;
  purpose: string;
  templateString: string;
  templateRefs: string[];
  propsInterface?: string;
  stateSignals?: string[];
  bindings: {
    type: 'bindText' | 'bindAttr' | 'bindClass' | 'bindStyle' | 'on' | 'controlFlow';
    targetRef: string;
    description: string;
  }[];
  children?: string[];
}

export interface RoutePlan {
  path: string;
  component: string;
  layout?: string;
  authRequired?: boolean;
  roleRequired?: string;
  title: string;
}

export interface StatePlan {
  domain: string;
  signals: { name: string; type: string; initialValue: string; description: string }[];
  computed: { name: string; derivation: string; description: string }[];
  stores?: { name: string; schema: string }[];
}

export interface DataModelPlan {
  name: string;
  fields: { name: string; type: string; required: boolean; validation?: string }[];
}

export interface ServicePlan {
  name: string;
  endpoints: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; requestType?: string; responseType: string }[];
  resourceLoader?: string;
}

export interface FormPlan {
  formName: string;
  model: string;
  fields: { name: string; label: string; inputType: string; validatorDescription: string; ariaRole?: string }[];
  submitHandler: string;
}

export interface SecurityPlan {
  trustedTypesRequired: boolean;
  contextualSanitizers: string[];
  csrfProtection: boolean;
  authGuard: string;
}

export interface TestingPlan {
  testSuites: {
    target: string;
    scenarios: string[];
  }[];
}

export interface ApplicationArchitecturePlan {
  appName: string;
  description: string;
  frameworkVersion: string;
  architecturePattern: 'Zero-VDOM Fine-Grained Reactive SPA' | 'Resumable Streaming SSR';
  componentHierarchy: ComponentPlan[];
  routing: RoutePlan[];
  stateManagement: StatePlan[];
  dataModels: DataModelPlan[];
  services: ServicePlan[];
  forms: FormPlan[];
  security: SecurityPlan;
  testing: TestingPlan;
}

export class ArchitecturePlanner {
  /**
   * Plans a complete Samrey application based on natural-language functional requirements.
   */
  planApplication(requirements: {
    appName: string;
    description: string;
    features: string[];
    authType?: 'mock' | 'session' | 'oauth';
  }): ApplicationArchitecturePlan {
    const isSaaS = requirements.features.some(f => /dashboard|saas|billing|user management/i.test(f));

    // 1. Data Models
    const dataModels: DataModelPlan[] = [
      {
        name: 'User',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'email', type: 'string', required: true, validation: 'Valid email with @ and domain' },
          { name: 'name', type: 'string', required: true, validation: 'Min length 2 characters' },
          { name: 'role', type: "'admin' | 'member' | 'viewer'", required: true },
          { name: 'status', type: "'active' | 'suspended'", required: true },
          { name: 'createdAt', type: 'string', required: true }
        ]
      }
    ];

    if (isSaaS) {
      dataModels.push({
        name: 'AnalyticsMetric',
        fields: [
          { name: 'label', type: 'string', required: true },
          { name: 'value', type: 'number', required: true },
          { name: 'changePercent', type: 'number', required: true },
          { name: 'trend', type: "'up' | 'down' | 'neutral'", required: true }
        ]
      });
    }

    // 2. State Management Plan
    const stateManagement: StatePlan[] = [
      {
        domain: 'AuthSession',
        signals: [
          { name: 'currentUser', type: 'User | null', initialValue: 'null', description: 'Active authenticated user' },
          { name: 'isAuthenticated', type: 'boolean', initialValue: 'false', description: 'Login flag' },
          { name: 'authLoading', type: 'boolean', initialValue: 'false', description: 'Async login/logout in flight' }
        ],
        computed: [
          { name: 'isAdmin', derivation: 'currentUser.value?.role === "admin"', description: 'Role guard computed value' }
        ]
      },
      {
        domain: 'Navigation',
        signals: [
          { name: 'sidebarOpen', type: 'boolean', initialValue: 'true', description: 'Responsive sidebar visibility' },
          { name: 'activeRoute', type: 'string', initialValue: '"/"', description: 'Current client path' }
        ],
        computed: []
      }
    ];

    if (isSaaS) {
      stateManagement.push({
        domain: 'UserManagement',
        signals: [
          { name: 'usersList', type: 'User[]', initialValue: '[]', description: 'All workspace users' },
          { name: 'searchQuery', type: 'string', initialValue: '""', description: 'Active filter query' },
          { name: 'roleFilter', type: 'string', initialValue: '"all"', description: 'Selected role filter' }
        ],
        computed: [
          {
            name: 'filteredUsers',
            derivation: 'usersList.value.filter(u => matches(u, searchQuery.value, roleFilter.value))',
            description: 'Fine-grained reactive filtered list of users'
          },
          {
            name: 'totalUsersCount',
            derivation: 'usersList.value.length',
            description: 'Total user count'
          }
        ]
      });
    }

    // 3. Routing Plan
    const routing: RoutePlan[] = [
      { path: '/', component: 'DashboardView', layout: 'AppLayout', authRequired: true, title: 'Dashboard' },
      { path: '/users', component: 'UsersView', layout: 'AppLayout', authRequired: true, roleRequired: 'admin', title: 'User Management' },
      { path: '/analytics', component: 'AnalyticsView', layout: 'AppLayout', authRequired: true, title: 'Analytics' },
      { path: '/login', component: 'LoginView', title: 'Sign In' },
      { path: '*', component: 'NotFoundView', title: 'Page Not Found' }
    ];

    // 4. Component Hierarchy Plan
    const componentHierarchy: ComponentPlan[] = [
      {
        name: 'AppLayout',
        purpose: 'Main authenticated shell with sidebar, header, and router outlet',
        templateString: '<div class="app-shell"><aside ref="sidebar"></aside><div class="main-area"><header ref="header"></header><main ref="outlet"></main></div></div>',
        templateRefs: ['sidebar', 'header', 'outlet'],
        bindings: [
          { type: 'controlFlow', targetRef: 'outlet', description: 'Mount RouterOutlet()' }
        ],
        children: ['SidebarNav', 'AppHeader']
      },
      {
        name: 'SidebarNav',
        purpose: 'Navigation links and responsive collapse toggle',
        templateString: '<nav class="sidebar-nav"><div class="brand"><h3>Samrey SaaS</h3></div><ul ref="navLinks"></ul></nav>',
        templateRefs: ['navLinks'],
        bindings: [
          { type: 'controlFlow', targetRef: 'navLinks', description: 'Append Link({ href, children }) items' }
        ]
      },
      {
        name: 'DashboardView',
        purpose: 'Metric cards, quick actions, and recent activity',
        templateString: '<div class="page-dashboard"><div ref="metricsGrid" class="metrics-grid"></div><div ref="activityFeed"></div></div>',
        templateRefs: ['metricsGrid', 'activityFeed'],
        bindings: [
          { type: 'controlFlow', targetRef: 'metricsGrid', description: 'Render MetricCard components via For()' }
        ],
        children: ['MetricCard']
      },
      {
        name: 'MetricCard',
        purpose: 'Individual metric widget',
        templateString: '<div class="metric-card"><span ref="label" class="label"></span><div ref="val" class="value"></div><span ref="trend" class="trend"></span></div>',
        templateRefs: ['label', 'val', 'trend'],
        propsInterface: 'interface MetricCardProps { label: string; value: number | string; trend?: string; }',
        bindings: [
          { type: 'bindText', targetRef: 'label', description: 'props.label' },
          { type: 'bindText', targetRef: 'val', description: 'props.value.toString()' },
          { type: 'bindText', targetRef: 'trend', description: 'props.trend || ""' }
        ]
      },
      {
        name: 'UsersView',
        purpose: 'User table, search bar, role filter, and user creation form',
        templateString: '<div class="page-users"><div class="toolbar"><input ref="search" placeholder="Search users..." /><button ref="addBtn">+ New User</button></div><div ref="userFormArea"></div><table ref="table" class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody ref="tbody"></tbody></table></div>',
        templateRefs: ['search', 'addBtn', 'userFormArea', 'table', 'tbody'],
        bindings: [
          { type: 'on', targetRef: 'search', description: 'Update searchQuery signal on input' },
          { type: 'controlFlow', targetRef: 'tbody', description: 'Render filteredUsers using For()' }
        ],
        children: ['UserForm', 'UserRow']
      }
    ];

    // 5. Form Plan
    const forms: FormPlan[] = [
      {
        formName: 'UserForm',
        model: 'User',
        fields: [
          { name: 'name', label: 'Full Name', inputType: 'text', validatorDescription: 'Required, min 2 chars' },
          { name: 'email', label: 'Email Address', inputType: 'email', validatorDescription: 'Required, valid email', ariaRole: 'alert' },
          { name: 'role', label: 'Role', inputType: 'select', validatorDescription: 'Must be admin, member, or viewer' }
        ],
        submitHandler: 'createUser(values)'
      },
      {
        formName: 'LoginForm',
        model: 'Credentials',
        fields: [
          { name: 'email', label: 'Email', inputType: 'email', validatorDescription: 'Required valid email' },
          { name: 'password', label: 'Password', inputType: 'password', validatorDescription: 'Required min 6 chars' }
        ],
        submitHandler: 'login(values)'
      }
    ];

    // 6. Services Plan
    const services: ServicePlan[] = [
      {
        name: 'UserService',
        endpoints: [
          { method: 'GET', path: '/api/users', responseType: 'User[]' },
          { method: 'POST', path: '/api/users', requestType: 'Omit<User, "id">', responseType: 'User' },
          { method: 'DELETE', path: '/api/users/:id', responseType: '{ success: boolean }' }
        ],
        resourceLoader: 'createResource(() => UserService.getUsers())'
      }
    ];

    // 7. Security Plan
    const security: SecurityPlan = {
      trustedTypesRequired: true,
      contextualSanitizers: ['sanitizeHtml', 'sanitizeUri'],
      csrfProtection: true,
      authGuard: 'Route Guard: Redirect to /login if !isAuthenticated.value'
    };

    // 8. Testing Plan
    const testing: TestingPlan = {
      testSuites: [
        {
          target: 'AppLayout',
          scenarios: ['Mounts sidebar, header, and outlet', 'Toggles responsive sidebar']
        },
        {
          target: 'UsersView',
          scenarios: ['Renders initial user list', 'Filters users on search query input', 'Submits new user via form', 'Deletes user and updates reactive list']
        },
        {
          target: 'AuthFlow',
          scenarios: ['Rejects invalid credentials', 'Logs in user and sets isAuthenticated signal', 'Guards protected routes']
        }
      ]
    };

    return {
      appName: requirements.appName,
      description: requirements.description,
      frameworkVersion: '2.1.0',
      architecturePattern: 'Zero-VDOM Fine-Grained Reactive SPA',
      componentHierarchy,
      routing,
      stateManagement,
      dataModels,
      services,
      forms,
      security,
      testing
    };
  }
}
