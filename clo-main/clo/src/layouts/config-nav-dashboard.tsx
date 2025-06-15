// config-nav-dashboard.ts
import { Icon } from '@iconify/react';

const icon = (iconName: string) => <Icon icon={iconName} width="24" height="24" />;

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: icon('mdi:home-outline'),
  },
  {
    title: 'Departments',
    path: '/departments', // Updated from '/departements'
    icon: icon('mdi:domain'),
  },
  {
    title: 'Subjects',
    path: '/subjects',
    icon: icon('mdi:book-open-variant'),
  },
  {
    title: 'Teachers',
    path: '/teachers',
    icon: icon('mdi:account-tie'),
  },
  {
    title: 'Students',
    path: '/students',
    icon: icon('mdi:account-school'),
  },
  {
    title: 'Student Tagging',
    path: '/student-tagging',
    icon: icon('mdi:tag-multiple'),
  },
  {
    title: 'CLO Management',
    path: '/clo-management',
    icon: icon('mdi:target'),
  },
  {
    title: 'Evaluation Setup',
    path: '/evaluation-setup',
    icon: icon('mdi:cog-outline'),
  },
  {
    title: 'Marks Upload',
    path: '/marks-upload',
    icon: icon('mdi:cloud-upload-outline'),
  },
  {
    title: 'Reports',
    path: '/instructor-submissions',
    icon: icon('mdi:chart-bar'),
  },
];