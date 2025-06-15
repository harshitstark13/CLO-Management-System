import { lazy, Suspense } from 'react';
import { Outlet, Navigate, useRoutes } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { varAlpha } from 'src/theme/styles';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';
import { ProtectedRoute } from './ProtectedRoute';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const BlogPage = lazy(() => import('src/pages/blog'));
export const UserPage = lazy(() => import('src/pages/user'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const Teacher = lazy(() => import('src/pages/teachers'));
export const Student = lazy(() => import('src/pages/students'));
export const Subject = lazy(() => import('src/pages/subjects'));
export const CLOManagement = lazy(() => import('src/pages/clo'));
export const InstructorCLOManagement = lazy(() => import('src/pages/instructor-clo'));
export const EvaluationSetupPage = lazy(() => import('src/pages/eval'));
export const InstructorSubmissions = lazy(() => import('src/pages/instructor-submissions'));
export const StudentTagging = lazy(() => import('src/pages/student-tagging'));
export const DepartmentsPage = lazy(() => import('src/pages/departements'));
// import { CLOManagement } from 'src/pages/clo';
// ----------------------------------------------------------------------

const renderFallback = (
  <Box display="flex" alignItems="center" justifyContent="center" flex="1 1 auto">
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export function Router() {
  return useRoutes([
    {
      element: (
        <ProtectedRoute>
        <DashboardLayout>
          <Suspense fallback={renderFallback}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
        </ProtectedRoute>
      ),
      children: [
        { element: <HomePage />, index: true },
        { path: 'user', element: <UserPage /> },
        { path: 'products', element: <ProductsPage /> },
        { path: 'blog', element: <BlogPage /> },
        { path: 'teachers', element: <Teacher /> },
        { path: 'students', element: <Student /> },
        { path: 'subjects', element: <Subject /> },
        { path: 'clo-management', element: <CLOManagement /> },
        { path: 'marks-upload', element: <InstructorCLOManagement /> },
        { path: 'evaluation-setup', element: <EvaluationSetupPage /> },
        { path: 'instructor-submissions', element: <InstructorSubmissions /> },
        { path: 'student-tagging', element: <StudentTagging /> },
        { path: 'departments', element: <DepartmentsPage /> },

      ],
    },
    {
      path: 'sign-in',
      element: (
        <AuthLayout>
          <SignInPage />
        </AuthLayout>
      ),
    },
    {
      path: '404',
      element: <Page404 />,
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);
}
