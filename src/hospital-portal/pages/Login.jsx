import LoginPage from '../../shared/components/LoginPage';

export default function HospitalLogin() {
  return (
    <LoginPage
      role="hospital"
      brandLabel="HOSPITAL PORTAL"
      homePath="/dashboard"
      accountHint="hospital@test.com — use the password set in Firebase Authentication."
    />
  );
}
