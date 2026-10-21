import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { WizardLayout } from "@/layouts/WizardLayout";

import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { ResendVerificationPage } from "@/pages/auth/ResendVerificationPage";
import { CheckEmailPage } from "@/pages/auth/CheckEmailPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { AcceptInvitePage } from "@/pages/auth/AcceptInvitePage";
import { KycOnboardingPage } from "@/pages/kyc/KycOnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/transactions/TransactionsPage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { PaymentLinksPage } from "@/pages/payment-links/PaymentLinksPage";
import { PayoutsPage } from "@/pages/payouts/PayoutsPage";
import { SubaccountsPage } from "@/pages/subaccounts/SubaccountsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/resend-verification" element={<ResendVerificationPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<WizardLayout />}>
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
            </Route>
            <Route element={<WizardLayout />}>
              <Route path="/onboarding" element={<KycOnboardingPage />} />
            </Route>

            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/payment-links" element={<PaymentLinksPage />} />
              <Route path="/subaccounts" element={<SubaccountsPage />} />
              <Route path="/payouts" element={<PayoutsPage />} />
              <Route path="/developers" element={<Navigate to="/settings/developers" replace />} />
              <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
              <Route path="/settings/:tab" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors closeButton />
    </ThemeProvider>
  );
}

export default App;
