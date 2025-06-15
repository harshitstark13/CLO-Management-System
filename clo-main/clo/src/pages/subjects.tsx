import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import SubjectsPage from 'src/sections/subjects/subjects';
// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Sign in - ${CONFIG.appName}`}</title>
      </Helmet>

      <SubjectsPage />
    </>
  );
}
