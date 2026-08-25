# Samrey Router Example

Demonstrates fine-grained reactive routing with parameterized segment matching, route transitions, and open-redirect sanitization.

## Code Overview

```typescript
import { createRouter } from '@samrey/router';

const router = createRouter({
  initialPath: '/users/42',
  routes: [
    { path: '/', component: HomeComponent },
    { path: '/users/:id', component: UserProfileComponent },
    { path: '/settings', component: SettingsComponent }
  ]
});

// Navigate reactively
router.navigate('/users/108');
console.log(router.params()); // { id: '108' }
```
