import "server-only";

export function getPublicLegalConfig() {
  return {
    controllerName: process.env.LEGAL_CONTROLLER_NAME?.trim() || null,
    controllerAddress: process.env.LEGAL_CONTROLLER_ADDRESS?.trim() || null,
    privacyEmail: process.env.PRIVACY_EMAIL?.trim() || null,
    supervisoryAuthority: process.env.PRIVACY_SUPERVISORY_AUTHORITY?.trim() || null,
    supervisoryAuthorityUrl: process.env.PRIVACY_SUPERVISORY_AUTHORITY_URL?.trim() || null,
  };
}
