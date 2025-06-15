import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useState, useContext } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Main } from './main';
import { layoutClasses } from '../classes';
import { NavMobile, NavDesktop } from './nav';
import { navData } from '../config-nav-dashboard';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';
import { AccountPopover } from '../components/account-popover';
import { AuthContext } from 'src/context/AuthContext';

// ----------------------------------------------------------------------

export type DashboardLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
};

export function DashboardLayout({ sx, children, header }: DashboardLayoutProps) {
  const theme = useTheme();
  const { role, coordinatorFor } = useContext(AuthContext); // Assuming AuthContext provides role and coordinatorFor
  const [navOpen, setNavOpen] = useState(false);
  const layoutQuery: Breakpoint = 'lg';

  // Filter navigation data based on user role and coordinator status
  const filteredNavData = navData.filter((item) => {
    if (role === 'admin') {
      return ['Dashboard', 'Departments', 'Subjects', 'Teachers','Students', 'Student Tagging'].includes(item.title);
    }
    if (role === 'instructor') {
      if (coordinatorFor) {
        // Instructor who is also a coordinator
        return [
          'Dashboard',
          'CLO Management',
          'Evaluation Setup',
          'Marks Upload',
          'Reports',
        ].includes(item.title);
      }
      // Regular instructor
      return ['Dashboard', 'Marks Upload'].includes(item.title);
    }
    return false; // Default case, should not occur if roles are enforced
  });

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        <HeaderSection
          layoutQuery={layoutQuery}
          slotProps={{
            container: {
              maxWidth: false,
              sx: { px: { [layoutQuery]: 5 } },
            },
          }}
          sx={header?.sx}
          slots={{
            topArea: (
              <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                This is an info Alert.
              </Alert>
            ),
            leftArea: (
              <>
                <MenuButton
                  onClick={() => setNavOpen(true)}
                  sx={{
                    ml: -1,
                    [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                  }}
                />
                <NavMobile
                  data={filteredNavData} // Use filtered data
                  open={navOpen}
                  onClose={() => setNavOpen(false)} workspaces={undefined}                />
              </>
            ),
            rightArea: (
              <Box gap={1} display="flex" alignItems="center">
                <AccountPopover
                  data={[
                    {
                      label: 'Home',
                      href: '/',
                      icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
                    },
                    {
                      label: 'Profile',
                      href: '#',
                      icon: <Iconify width={22} icon="solar:shield-keyhole-bold-duotone" />,
                    },
                    {
                      label: 'Settings',
                      href: '#',
                      icon: <Iconify width={22} icon="solar:settings-bold-duotone" />,
                    },
                  ]}
                />
              </Box>
            ),
          }}
        />
      }
      /** **************************************
       * Sidebar
       *************************************** */
      sidebarSection={
        <NavDesktop data={filteredNavData} layoutQuery={layoutQuery} workspaces={undefined}  /> // Use filtered data
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{
        '--layout-nav-vertical-width': '300px',
        '--layout-dashboard-content-pt': theme.spacing(1),
        '--layout-dashboard-content-pb': theme.spacing(8),
        '--layout-dashboard-content-px': theme.spacing(5),
      }}
      sx={{
        [`& .${layoutClasses.hasSidebar}`]: {
          [theme.breakpoints.up(layoutQuery)]: {
            pl: 'var(--layout-nav-vertical-width)',
          },
        },
        ...sx,
      }}
    >
      <Main>{children}</Main>
    </LayoutSection>
  );
}