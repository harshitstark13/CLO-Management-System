import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import TeachersPage from 'src/sections/teachers/teacher';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Sign in - ${CONFIG.appName}`}</title>
      </Helmet>

      <TeachersPage />
    </>
  );
}
