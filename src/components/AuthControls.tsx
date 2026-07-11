import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/tanstack-react-start";
import { useClerkEnabled } from "./ClerkBoundary";

export function AuthControls({ compact = false }: { compact?: boolean }) {
  const enabled = useClerkEnabled();

  if (!enabled) {
    return (
      <div className={`auth-controls${compact ? " auth-controls-compact" : ""}`}>
        <span className="auth-setup-label" title="Clerk API 키를 연결하면 로그인할 수 있습니다.">
          로그인 준비 중
        </span>
      </div>
    );
  }

  return (
    <div className={`auth-controls${compact ? " auth-controls-compact" : ""}`}>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="auth-button auth-button-quiet" type="button">
            로그인
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="auth-button auth-button-primary" type="button">
            가입하기
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
