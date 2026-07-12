import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/tanstack-react-start";
import { useClerkEnabled } from "./ClerkBoundary";
import { useLocale } from "../features/localization/localization";
import { AdminLink } from "./AdminLink";

export function AuthControls({ compact = false }: { compact?: boolean }) {
  const enabled = useClerkEnabled();
  const { locale } = useLocale();

  if (!enabled) {
    return (
      <div className={`auth-controls${compact ? " auth-controls-compact" : ""}`}>
        <span className="auth-setup-label" title={locale === "ko" ? "Clerk API 키를 연결하면 로그인할 수 있습니다." : "Connect a Clerk API key to enable sign-in."}>
          {locale === "ko" ? "로그인 준비 중" : "Sign-in unavailable"}
        </span>
      </div>
    );
  }

  return (
    <div className={`auth-controls${compact ? " auth-controls-compact" : ""}`}>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="auth-button auth-button-quiet" type="button">
            {locale === "ko" ? "로그인" : "Sign in"}
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="auth-button auth-button-primary" type="button">
            {locale === "ko" ? "가입하기" : "Sign up"}
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <AdminLink />
        <UserButton />
      </Show>
    </div>
  );
}
