import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import InstructorSubmissionsPage from 'src/sections/instructor/InstructorSubmissions';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`404 page not found! | Error - ${CONFIG.appName}`}</title>
      </Helmet>

      <InstructorSubmissionsPage />
    </>
  );
}
