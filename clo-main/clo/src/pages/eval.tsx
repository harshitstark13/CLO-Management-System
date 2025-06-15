import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import EvaluationSetupPage from 'src/sections/eval/EvaluationSetupPage';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`404 page not found! | Error - ${CONFIG.appName}`}</title>
      </Helmet>

      <EvaluationSetupPage />
    </>
  );
}
