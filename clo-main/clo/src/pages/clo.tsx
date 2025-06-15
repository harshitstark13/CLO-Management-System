import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import CLOManagementPage from 'src/sections/clo/clo-management';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Blog - ${CONFIG.appName}`}</title>
      </Helmet>

      <CLOManagementPage />
    </>
  );
}
