import { Eye, EyeOff } from 'lucide-react';

export default function LoginView(props) {
  const {
    authStep, pendingUser, emailInput, passwordInput, showPassword, rememberMe, showRolePresets,
    otpInput, authBanner, failedAttempts, isLockedOut, DEMO_USERS,
    handleEmailInput, setPasswordInput, setShowPassword, setRememberMe, setShowRolePresets,
    setAuthStep, setPendingUser, setAuthBanner, selectPresetRole,
    handleSignInSubmit, setOtpInput, handleMfaVerify
  } = props;

  return (
<>
        <div className="login-wrapper">
          {/* LEFT 52% PANE: WARM STONE (#DEDAD0) GALLERY SHOWCASE */}
          <section className="gallery-panel">
            <div className="eyebrow-label">AEGIS / PRIVATE VIEW</div>

            <div className="gallery-center">
              <h2 className="gallery-headline">
                A closer
                <br />
                look changes
                <br />
                everything.
              </h2>

              <div className="artwork-container">
                <div className="artwork-frame">
                  <svg
                    viewBox="0 0 380 238"
                    aria-label="Study in Balance Geometric Composition"
                  >
                    <rect width="380" height="238" fill="#F5F2EB" />
                    {/* Left Terracotta Dome (#9E5438) */}
                    <path
                      d="M 74 205 L 74 115 A 68 68 0 0 1 210 115 L 210 205 Z"
                      fill="#9E5438"
                    />
                    {/* Right Overlapping Deep Slate Green U-Arch (#2D403D) */}
                    <path
                      d="M 185 95 L 325 95 L 325 148 A 70 70 0 0 1 185 148 Z"
                      fill="#2D403D"
                    />
                  </svg>
                </div>

                <div>
                  <div className="artwork-caption-title">STUDY IN BALANCE</div>
                  <div className="artwork-caption-sub">Zero-trust architecture / 2026</div>
                </div>
              </div>
            </div>

            <div className="gallery-footer">
              Inspect the logs. Verify the people behind them.
            </div>
          </section>

          {/* RIGHT 48% PANE: WARM IVORY (#F8F7F4) MEMBER ACCESS FORM */}
          <section className="form-panel">
            <div className="form-box">
              <div className="form-header">
                <div className="form-eyebrow">SECURITY PORTAL / MEMBER ACCESS</div>
                <h1 className="form-title">
                  {authStep === 'LOGIN' ? 'Step a little closer.' : 'Second factor check.'}
                </h1>
                <p className="form-subtitle">
                  {authStep === 'LOGIN'
                    ? 'Your secure workspace is right where you left it.'
                    : `Enter the 6-digit verification code for ${pendingUser?.name}.`}
                </p>
              </div>

              {authBanner && (
                <div className={`alert-banner ${authBanner.type === 'error' ? 'error' : ''}`}>
                  {authBanner.text}
                </div>
              )}

              {authStep === 'LOGIN' ? (
                <form onSubmit={handleSignInSubmit} className="auth-form">
                  <div className="input-group">
                    <label htmlFor="email-input" className="input-label">
                      Email address
                    </label>
                    <input
                      id="email-input"
                      type="text"
                      value={emailInput}
                      onChange={(e) => handleEmailInput(e.target.value)}
                      disabled={isLockedOut}
                      placeholder="admin@aegis.io"
                      required
                      className="text-input"
                    />
                  </div>

                  <div className="input-group">
                    <div className="input-label-row">
                      <label htmlFor="password-input" className="input-label">
                        Password
                      </label>
                      {failedAttempts > 0 && (
                        <span className="attempt-counter">Attempts: {failedAttempts}/5</span>
                      )}
                    </div>
                    <div className="password-wrapper">
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        disabled={isLockedOut}
                        placeholder="••••••••••••"
                        required
                        className="text-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="eye-toggle-btn"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-options-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthBanner({
                          type: 'error',
                          text: 'Password reset is not available here. Contact a Super Admin if your account is locked.'
                        });
                      }}
                      className="text-link-btn"
                    >
                      Reset password
                    </button>
                  </div>

                  <button type="submit" disabled={isLockedOut} className="btn-primary">
                    {isLockedOut ? 'Account Temporarily Locked' : 'Sign in'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMfaVerify} className="auth-form">
                  <div className="mfa-token-box">
                    <div>
                      <span className="demo-note" style={{ display: 'block' }}>
                        Authenticator Token
                      </span>
                      <strong style={{ fontSize: '12px' }}>{pendingUser?.roleLabel}</strong>
                    </div>
                    <span className="mfa-code-badge">{pendingUser?.demoOtp}</span>
                  </div>

                  <div className="input-group">
                    <label htmlFor="otp-input" className="input-label">
                      6-Digit Verification Code
                    </label>
                    <input
                      id="otp-input"
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="text-input otp-input"
                    />
                  </div>

                  <div className="mfa-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('LOGIN');
                        setPendingUser(null);
                        setAuthBanner(null);
                      }}
                      className="btn-secondary"
                    >
                      Back
                    </button>
                    <button type="submit" className="btn-primary">
                      Verify & Enter Enclave
                    </button>
                  </div>
                </form>
              )}

              <div className="form-footer-section">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRolePresets((prev) => !prev)}
                    className="text-link-btn"
                  >
                    Create account
                  </button>
                </div>

                <p className="demo-note">
                  Demo mode. Select a role preset below or sign in to test RBAC & Audit Logs.
                </p>

                {showRolePresets && (
                  <div className="role-pills-row">
                    {DEMO_USERS.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectPresetRole(u)}
                        className={`role-pill ${emailInput === u.email ? 'active' : ''}`}
                      >
                        {u.roleLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
</>
  );
}
