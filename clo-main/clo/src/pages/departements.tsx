import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import DepartmentsPage from 'src/sections/departements/DepartmentsPage';
// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`404 page not found! | Error - ${CONFIG.appName}`}</title>
      </Helmet>

      <DepartmentsPage />
    </>
  );
}
