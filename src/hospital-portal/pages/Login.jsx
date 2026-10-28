import LoginPage from '../../shared/components/LoginPage';

export default function HospitalLogin() {
  return (
    <LoginPage
      role="hospital"
      brandLabel="HOSPITAL PORTAL"
      homePath="/dashboard"
      accountHint="hospital@lifeline.demo / Lifeline@123"
    />
  );
}
