import LoginPage from '../../shared/components/LoginPage';

export default function HospitalLogin() {
  return (
    <LoginPage
      role="hospital"
      brandLabel="HOSPITAL PORTAL"
      homePath="/dashboard"
      demoEmail="hospital@lifeline.demo"
    />
  );
}
