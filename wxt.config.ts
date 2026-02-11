import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'SentinelFi',
    description: 'Rug-pull shield for RobinPump. See safety scores on every token.',
    permissions: ['storage', 'alarms', 'offscreen'],
    host_permissions: ['https://robinpump.fun/*'],
  },
});
