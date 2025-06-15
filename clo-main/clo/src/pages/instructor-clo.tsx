import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import MarksUploadPage from 'src/sections/instructor/InstructorCLOViewPage';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`404 page not found! | Error - ${CONFIG.appName}`}</title>
      </Helmet>

      <MarksUploadPage />
    </>
  );
}
