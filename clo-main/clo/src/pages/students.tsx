import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import StudentsPage from 'src/sections/students/students';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Sign in - ${CONFIG.appName}`}</title>
      </Helmet>

      <StudentsPage />
    </>
  );
}
