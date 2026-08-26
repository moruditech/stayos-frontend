'use strict';

const asyncHandler  = require('../../utils/asyncHandler');
const ApiResponse   = require('../../utils/ApiResponse');
const ApiError      = require('../../utils/ApiError');
const authService   = require('./auth.service');
const env           = require('../../config/env');

// ── Cookie configuration for refresh token ────────────────────────────────────
// Backend TAD Amendment 1 — Remember Me. When rememberMe is true the cookie
// carries an explicit maxAge (persists across browser restarts, 30 days,
// matching token.service.js's REFRESH_TTL_SECONDS_REMEMBERED). When false,
// maxAge is omitted entirely — an ordinary session cookie that the browser
// discards when it closes, regardless of the JWT's own 7-day expiry ceiling.
const baseCookieOpts = {
  httpOnly: true,
  // Frontend (Netlify) and API (Render) live on different domains, so this
  // cookie is cross-site from the browser's point of view. SameSite=None is
  // required for the browser to attach it on cross-site fetch/XHR calls —
  // and browsers require Secure whenever SameSite=None is used, so this
  // must stay true (not just true-in-production) or the cookie is rejected.
  secure:   true,
  sameSite: 'none',
  path:     '/api/v1/auth',
};

const getRefreshCookieOpts = (rememberMe) => (
  rememberMe
    ? { ...baseCookieOpts, maxAge: 30 * 24 * 60 * 60 * 1000 }   // 30 days, persistent
    : { ...baseCookieOpts }                                      // session cookie, no maxAge
);

// ── POST /auth/register ───────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return ApiResponse.created(res, result, result.message);
});

// ── GET /auth/verify/:token ───────────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.params.token);
  return ApiResponse.success(res, null, result.message);
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req.ip);

  // MFA required — return temp token only, no refresh cookie yet. rememberMe
  // is already embedded in the temp token itself (auth.service.js) so it
  // survives to the eventual /auth/mfa/verify call without the client
  // needing to resend it.
  if (result.mfaRequired) {
    return ApiResponse.success(res, {
      mfaRequired: true,
      tempToken:   result.tempToken,
    }, result.message);
  }

  // Full login success — set refresh token in HttpOnly cookie
  res.cookie('refreshToken', result.refreshToken, getRefreshCookieOpts(result.rememberMe));

  return ApiResponse.success(res, {
    accessToken: result.accessToken,
    rememberMe:  result.rememberMe,
    user:        result.user,
  }, 'Login successful');
});

// ── POST /auth/mfa/verify ─────────────────────────────────────────────────────
exports.verifyMfa = asyncHandler(async (req, res) => {
  const result = await authService.verifyMfa(req.body, req.ip);

  res.cookie('refreshToken', result.refreshToken, getRefreshCookieOpts(result.rememberMe));

  return ApiResponse.success(res, {
    accessToken: result.accessToken,
    rememberMe:  result.rememberMe,
    user:        result.user,
  }, 'MFA verification successful');
});

// ── POST /auth/mfa/enable ─────────────────────────────────────────────────────
exports.enableMfa = asyncHandler(async (req, res) => {
  const userType = req.user.scope === 'tenant' ? 'property' : req.user.scope;
  const result   = await authService.enableMfa(req.userId, userType);
  return ApiResponse.success(res, result, result.message);
});

// ── POST /auth/mfa/confirm ────────────────────────────────────────────────────
exports.confirmMfa = asyncHandler(async (req, res) => {
  const userType = req.user.scope === 'tenant' ? 'property' : req.user.scope;
  const result   = await authService.confirmMfa(
    req.userId,
    userType,
    req.body.totpCode
  );
  return ApiResponse.success(res, null, result.message);
});

// ── POST /auth/mfa/disable ────────────────────────────────────────────────────
exports.disableMfa = asyncHandler(async (req, res) => {
  const userType = req.user.scope === 'tenant' ? 'property' : req.user.scope;
  const result   = await authService.disableMfa(
    req.userId,
    userType,
    req.body.totpCode
  );
  return ApiResponse.success(res, null, result.message);
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────
exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token provided', null, 'NO_TOKEN');
  }

  const result = await authService.refreshToken(refreshToken);

  // Bug fix (found while implementing Amendment 1): the rotated refresh
  // token was never written back to the client's cookie, so the SECOND
  // refresh attempt after any first refresh would always fail — the client
  // kept presenting the now-superseded token while Redis held the new one.
  // Re-issuing the cookie here also lets the "remember me" window keep
  // sliding on every silent refresh, per Amendment 1.
  res.cookie('refreshToken', result.refreshToken, getRefreshCookieOpts(result.rememberMe));

  return ApiResponse.success(
    res,
    { accessToken: result.accessToken, rememberMe: result.rememberMe },
    'Token refreshed'
  );
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1];

  await authService.logout(req.userId, accessToken);

  // Clear the refresh token cookie
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });

  return ApiResponse.success(res, null, 'Logged out successfully');
});

// ── POST /auth/forgot-password ────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  // Always 200 — never reveal if email exists
  return ApiResponse.success(res, null, result.message);
});

// ── POST /auth/reset-password/:token ─────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.params.token, req.body);
  return ApiResponse.success(res, null, result.message);
});

exports.claimAccount = asyncHandler(async (req, res) => {
  const result = await authService.claimAccount(req.params.token, req.body);
  return ApiResponse.success(res, null, result.message);
});

// ── GET /auth/google ──────────────────────────────────────────────────────────
exports.googleAuth = asyncHandler(async (req, res) => {
  const url = authService.getGoogleAuthUrl();
  return res.redirect(url);
});

// ── GET /auth/google/callback ─────────────────────────────────────────────────
exports.googleCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    throw new ApiError(400, 'No authorisation code received from Google', null, 'BAD_REQUEST');
  }

  const result = await authService.handleGoogleCallback(code, req.ip);

  // OAuth logins are always "remembered" (see auth.service.js) — no login
  // form checkbox exists in a redirect-based flow.
  res.cookie('refreshToken', result.refreshToken, getRefreshCookieOpts(true));

  // Client reads token from URL and stores in memory
  return res.redirect(
    `${env.CLIENT_URL}/auth/callback?token=${result.accessToken}`
  );
});
