import { UserRole } from '../../models/status';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: UserRole[];

  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [

  {
    label: 'Dashboard',
    route: '/resident/dashboard',
    icon: 'dashboard',
    roles: [UserRole.RESIDENT],
    exact: true
  },
  {
    label: 'Maintenance',
    route: '/resident/maintenance-view',
    icon: 'handyman',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'New Ticket',
    route: '/resident/create-ticket',
    icon: 'add_circle',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'Visitors',
    route: '/resident/visitors',
    icon: 'badge',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'Invite Visitor',
    route: '/resident/create-visit',
    icon: 'person_add',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'Invoices',
    route: '/resident/invoices',
    icon: 'receipt_long',
    roles: [UserRole.RESIDENT]
  },

  {
    label: 'Dashboard',
    route: '/technician/dashboard',
    icon: 'dashboard',
    roles: [UserRole.TECHNICIAN],
    exact: true
  },
  {
    label: 'Available Requests',
    route: '/technician/available-requests',
    icon: 'handyman',
    roles: [UserRole.TECHNICIAN]
  },
  {
    label: 'Assigned Jobs',
    route: '/technician/assigned-jobs',
    icon: 'work_outline',
    roles: [UserRole.TECHNICIAN]
  },
  {
    label: 'My Offers',
    route: '/technician/my-offers',
    icon: 'request_quote',
    roles: [UserRole.TECHNICIAN]
  },
  {
    label: 'Reviews',
    route: '/technician/reviews',
    icon: 'star_rate',
    roles: [UserRole.TECHNICIAN]
  },

  {
    label: 'Visitors',
    route: '/security/visitors',
    icon: 'dashboard',
    roles: [UserRole.SECURITY],
    exact: true
  },
  {
    label: 'Visit List',
    route: '/security/visitors/list',
    icon: 'list_alt',
    roles: [UserRole.SECURITY]
  },
  {
    label: 'QR Scanner',
    route: '/security/visitors/scanner',
    icon: 'qr_code_scanner',
    roles: [UserRole.SECURITY]
  },
  {
    label: 'Check In / Out',
    route: '/security/visitors/check-in-out',
    icon: 'fact_check',
    roles: [UserRole.SECURITY]
  },
  {
    label: 'Access History',
    route: '/security/visitors/history',
    icon: 'history',
    roles: [UserRole.SECURITY]
  },

  {
    label: 'Dashboard',
    route: '/admin/dashboard',
    icon: 'dashboard',
    roles: [UserRole.ADMIN],
    exact: true
  },
  {
    label: 'Users',
    route: '/admin/users',
    icon: 'group',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Buildings & Units',
    route: '/admin/compound',
    icon: 'apartment',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Maintenance',
    route: '/admin/maintenance',
    icon: 'handyman',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Visit Logs',
    route: '/admin/visitors',
    icon: 'badge',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Invoices',
    route: '/admin/invoices',
    icon: 'receipt_long',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Reports',
    route: '/admin/reports',
    icon: 'analytics',
    roles: [UserRole.ADMIN]
  },

  {
    label: 'Messages',
    route: '/chat',
    icon: 'chat',
    roles: undefined
  },
  {
    label: 'Notifications',
    route: '/notifications',
    icon: 'notifications'
  },
  {
    label: 'Profile',
    route: '/profile',
    icon: 'person'
  }
];

export function visibleNavItems(role: UserRole | null): NavItem[] {
  if (!role) {
    return [];
  }

  return NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role));
}