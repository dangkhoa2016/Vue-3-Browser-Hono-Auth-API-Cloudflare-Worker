# Reset a user's password

> 🌐 Language / Ngôn ngữ: **English** | [Tiếng Việt](ADMIN_PASSWORD_RESET.vi.md)

Open **User management** (`/#/admin/users`) and choose the key button for the target account. Admin sees this action for User; Super Admin sees it for User/Admin. Self, peer and higher-role accounts have no reset action. Use Profile to change your own password.

The dialog identifies the target by name/email and warns that all their devices will be signed out. Enter and confirm a new password, then choose **Reset password**. Use at least 8 characters and at most 72 UTF-8 bytes; whitespace is preserved. Cancel, close or Escape clears both password fields.

The client sends one POST to `/api/admin/users/:id/reset-password`; the backend authorizes the operation and commits password replacement, session revocation and audit together. After success, share the new password securely so the user can sign in again. There is no automatic email or mandatory password change at the next login.

Mock mode explains that a real backend is required instead of reporting a successful reset. The dialog clears credentials when the session/backend changes or the page unmounts, prevents duplicate submission and ignores old-session responses. Failed mutations are never automatically replayed; inspect an ambiguous timeout before deliberately retrying.

An older backend without this endpoint returns an error; deploy compatible versions of both projects. [Backend contract](https://github.com/dangkhoa2016/Hono-Auth-API-Cloudflare-Worker/blob/main/documents/ADMIN_PASSWORD_RESET.md). Sources: [dialog](../vue/components/PasswordResetModal.vue), [composable](../vue/composables/useAdminPasswordReset.js).
