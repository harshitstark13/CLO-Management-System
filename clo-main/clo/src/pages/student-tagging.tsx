import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import StudentTaggingPage from 'src/sections/tagging/StudentTagging';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Sign in - ${CONFIG.appName}`}</title>
      </Helmet>

      <StudentTaggingPage />
    </>
  );
}
