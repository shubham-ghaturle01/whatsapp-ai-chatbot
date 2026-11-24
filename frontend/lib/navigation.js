export const navGroups = [
  {
    label: 'Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Overview',
        icon: 'LayoutDashboard',
        href: '/',
      },
      {
        id: 'inbox',
        label: 'Inbox',
        icon: 'Inbox',
        href: '/inbox',
      },
      {
        id: 'chatbots',
        label: 'AI assistants',
        icon: 'Bot',
        href: '/chatbots',
      },
      {
        id: 'knowledge',
        label: 'Knowledge base',
        icon: 'Files',
        href: '/knowledge',
      },
      {
        id: 'workflows',
        label: 'Workflows',
        icon: 'Workflow',
        href: '/workflows',
      },
    ],
  },
  {
    label: 'Manage',
    items: [
      {
        id: 'integrations',
        label: 'Integrations',
        icon: 'Blocks',
        href: '/integrations',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'ChartNoAxesCombined',
        href: '/analytics',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'Settings2',
        href: '/settings',
      },
    ],
  },
];
